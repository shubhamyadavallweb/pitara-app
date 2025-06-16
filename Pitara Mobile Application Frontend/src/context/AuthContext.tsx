import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { showToast } from '@/utils/feedback';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../environment';
import { Preferences } from '@capacitor/preferences';

interface User {
  id: string;
  email: string | undefined;
  name: string | undefined;
  avatar: string | undefined;
  role?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const isNative = Capacitor.isNativePlatform();

  const transformSupabaseUser = (supabaseUser: SupabaseUser): User => {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || undefined,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      avatar: supabaseUser.user_metadata?.avatar_url || undefined,
      role: supabaseUser.app_metadata?.role || 'user'
    };
  };

  // Get redirect URL based on platform
  const getRedirectUrl = () => {
    if (isNative) {
      return 'pitara://auth/callback';
    } else {
      return 'https://jdfnkvbfpvzddjtgiovj.supabase.co/auth/v1/callback';
    }
  };

  // Handle OAuth callback URLs/deep links
  const handleDeepLink = async (url: string) => {
    if (!url) return;

    if (url.includes('error=')) {
      console.error('OAuth error in URL', url);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Processing auth callback URL');
      setIsLoading(true);
      
      // Handle the URL for auth flow completion
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session in deep link handler:', error);
        setIsLoading(false);
        return;
      }
      
      if (data?.session) {
        console.log('Session found in deep link handler');
        const transformedUser = transformSupabaseUser(data.session.user);
        setSession(data.session);
        setUser(transformedUser);
        if (isNative) {
          await Preferences.set({ key: 'pitara_user', value: JSON.stringify(transformedUser) });
        } else {
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        }
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.error('Error in deep link handler:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check for active session on component mount
    const fetchSession = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error fetching session:', error);
          return;
        }
        
        if (data?.session) {
          setSession(data.session);
          const transformedUser = transformSupabaseUser(data.session.user);
          setUser(transformedUser);
          if (isNative) {
            await Preferences.set({ key: 'pitara_user', value: JSON.stringify(transformedUser) });
          } else {
            localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          }
          console.log('User authenticated from session', transformedUser.email);
        } else {
          // Check storage fallback
          try {
            let storedUser = null;
            if (isNative) {
              const { value } = await Preferences.get({ key: 'pitara_user' });
              if (value) {
                storedUser = JSON.parse(value);
              }
            } else {
              const value = localStorage.getItem('pitara_user');
              if (value) {
                storedUser = JSON.parse(value);
              }
            }
            
            if (storedUser && storedUser.id) {
              setUser(storedUser);
              console.log('User authenticated from storage', storedUser.email);
            }
          } catch (err) {
            console.error('Failed to parse user from storage', err);
          }
        }
      } catch (error) {
        console.error('Error in session initialization:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSession();

    // Handle deep link if app was cold-started from OAuth redirect
    if (isNative) {
      CapacitorApp.getLaunchUrl().then(launchData => {
        if (launchData?.url) {
          console.log('Cold start deep link detected:', launchData.url);
          handleDeepLink(launchData.url);
        }
      });

      // Add app state change listener for handling deep links
      CapacitorApp.addListener('appUrlOpen', (data: { url: string }) => {
        console.log('App opened with URL:', data.url);
        handleDeepLink(data.url);
      });
    }

    // Add auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (session) {
        const transformedUser = transformSupabaseUser(session.user);
        setSession(session);
        setUser(transformedUser);
        if (isNative) {
          await Preferences.set({ key: 'pitara_user', value: JSON.stringify(transformedUser) });
        } else {
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        }
      } else {
        setSession(null);
        setUser(null);
        if (isNative) {
          await Preferences.remove({ key: 'pitara_user' });
        } else {
          localStorage.removeItem('pitara_user');
        }
      }
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
      if (isNative) {
        CapacitorApp.removeAllListeners();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 === GOOGLE SIGN-IN DEBUG START ===');

      if (isNative) {
        try {
          console.log('📱 Platform: Native (Android/iOS)');
          console.log('🔧 Initializing GoogleAuth plugin...');
          
          await GoogleAuth.initialize({
            androidClientId: GOOGLE_ANDROID_CLIENT_ID,
            serverClientId: GOOGLE_WEB_CLIENT_ID,
            scopes: ['profile', 'email'],
            forceCodeForRefreshToken: true,
          });

          console.log('✅ GoogleAuth plugin initialized successfully');
          console.log('🎯 Launching Google account picker...');
          
          const googleUser = await GoogleAuth.signIn();
          
          console.log('📋 === COMPLETE GOOGLE USER RESPONSE ===');
          console.log('GoogleUser email:', googleUser?.email);
          
          const auth = googleUser?.authentication;
          if (!auth) {
            throw new Error('No authentication data received from Google');
          }

          const idToken = auth.idToken;
          const accessToken = auth.accessToken;

          if (!idToken) {
            throw new Error('Failed to retrieve ID token from Google Sign-In');
          }

          console.log('🔗 === SUPABASE INTEGRATION START ===');
          
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
            nonce: undefined,
          });

          if (error) {
            console.error('❌ SUPABASE ERROR:', error);
            showToast({ message: `Login failed: ${error.message}`, type: 'error' });
            return;
          }

          if (data?.user && data?.session) {
            console.log('🎉 === SUCCESS: AUTHENTICATION COMPLETE ===');
            const transformedUser = transformSupabaseUser(data.user);
            setSession(data.session);
            setUser(transformedUser);
            await Preferences.set({ key: 'pitara_user', value: JSON.stringify(transformedUser) });
            showToast({ message: `Welcome ${transformedUser.name}!`, type: 'success' });
          }
        } catch (nativeErr: any) {
          console.error('💥 === NATIVE GOOGLE SIGN-IN ERROR ===', nativeErr);
          showToast({ message: nativeErr?.message || 'Native sign-in failed', type: 'error' });
        }
      } else {
        console.log('🌐 Platform: Web/PWA');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: getRedirectUrl(),
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account'
            }
          }
        });

        if (error) {
          console.error('Error with OAuth flow:', error);
          showToast({ message: `Login failed: ${error.message}`, type: 'error' });
        }
      }
    } catch (error: any) {
      console.error('💥 === TOP-LEVEL GOOGLE SIGN-IN ERROR ===', error);
      showToast({ message: 'Failed to sign in. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
      console.log('🏁 === GOOGLE SIGN-IN DEBUG END ===');
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      if (isNative) {
        await GoogleAuth.signOut();
      }
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSession(null);
      setUser(null);
      if (isNative) {
        await Preferences.remove({ key: 'pitara_user' });
      } else {
        localStorage.removeItem('pitara_user');
      }
      showToast({ message: 'Successfully logged out', type: 'success' });
    } catch (error) {
      console.error('Error signing out:', error);
      showToast({ message: 'Failed to sign out', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    setUser(userData);
    if (isNative) {
      await Preferences.set({ key: 'pitara_user', value: JSON.stringify(userData) });
    } else {
      localStorage.setItem('pitara_user', JSON.stringify(userData));
    }
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      setUser(null);
      if (isNative) {
        await Preferences.remove({ key: 'pitara_user' });
      } else {
        localStorage.removeItem('pitara_user');
      }
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: updatedUser.name,
            avatar_url: updatedUser.avatar
          })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating profile:', error);
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
      
      if (isNative) {
        await Preferences.set({ key: 'pitara_user', value: JSON.stringify(updatedUser) });
      } else {
        localStorage.setItem('pitara_user', JSON.stringify(updatedUser));
      }
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated,
        isLoading,
        login,
        logout,
        updateProfile,
        signInWithGoogle,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
