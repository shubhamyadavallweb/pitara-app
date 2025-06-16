import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { showToast } from '@/utils/feedback';
import { GOOGLE_WEB_CLIENT_ID } from '../environment';
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

    console.log('🔗 Deep link received:', url);

    // Check for OAuth errors in URL
    if (url.includes('error=')) {
      console.error('❌ OAuth error in URL:', url);
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      showToast({ 
        message: `Authentication failed: ${errorDescription || error}`, 
        type: 'error' 
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔄 Processing auth callback URL...');
      setIsLoading(true);
      
      // Check if URL contains auth tokens or fragments (for browser-based OAuth)
      if (url.includes('access_token=') || url.includes('code=') || url.includes('#access_token')) {
        console.log('🎯 Auth tokens detected in URL, processing...');
        
        // For OAuth redirect with fragment/hash, we need to get the session
        // Supabase automatically handles OAuth callbacks through the auth state listener
        // So we just need to wait for the session to be established
        setTimeout(async () => {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ Error getting session after OAuth:', error);
            showToast({ message: `Authentication failed: ${error.message}`, type: 'error' });
            setIsLoading(false);
            return;
          }
          
          if (data?.session) {
            console.log('✅ Session found after OAuth callback');
            const transformedUser = transformSupabaseUser(data.session.user);
            setSession(data.session);
            setUser(transformedUser);
            
            // Store user data for persistence
            if (isNative) {
              await Preferences.set({ key: 'pitara_user', value: JSON.stringify(transformedUser) });
            } else {
              localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
            }
            
            showToast({ 
              message: `Welcome back, ${transformedUser.name}!`, 
              type: 'success' 
            });
            
            setIsLoading(false);
          } else {
            console.log('⚠️ No session found after OAuth callback, will retry...');
            setIsLoading(false);
          }
        }, 1000); // Wait 1 second for OAuth to process
        
        return;
      }
      
      // Fallback: try to get current session
      console.log('🔍 Checking for existing session...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting session in deep link handler:', error);
        setIsLoading(false);
        return;
      }
      
      if (data?.session) {
        console.log('✅ Session found in deep link handler');
        const transformedUser = transformSupabaseUser(data.session.user);
        setSession(data.session);
        setUser(transformedUser);
        
        if (isNative) {
          await Preferences.set({ key: 'pitara_user', value: JSON.stringify(transformedUser) });
        } else {
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        }
        
        showToast({ 
          message: `Welcome back, ${transformedUser.name}!`, 
          type: 'success' 
        });
      } else {
        console.log('ℹ️ No session found after OAuth callback');
      }
      
    } catch (error) {
      console.error('💥 Error in deep link handler:', error);
      showToast({ message: 'Authentication failed. Please try again.', type: 'error' });
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
      
      // Always use browser-based authentication for better user experience
      console.log('🌐 Using browser-based Google authentication');
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent select_account'
          },
          scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
          skipBrowserRedirect: false
        }
      });

      if (error) {
        console.error('❌ Error with OAuth flow:', error);
        showToast({ message: `Login failed: ${error.message}`, type: 'error' });
        setIsLoading(false);
        return;
      }
      
      console.log('✅ OAuth request initiated successfully');
      
      // For browser-based auth, the loading state will be managed by the redirect
      // Don't set loading to false here as the user will be redirected
      if (!isNative) {
        setIsLoading(false);
      }
      
    } catch (error: any) {
      console.error('💥 === TOP-LEVEL GOOGLE SIGN-IN ERROR ===', error);
      showToast({ message: 'Failed to sign in. Please try again.', type: 'error' });
      setIsLoading(false);
    }
    
    console.log('🏁 === GOOGLE SIGN-IN DEBUG END ===');
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      console.log('🚪 Starting sign out process...');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error signing out from Supabase:', error);
        throw error;
      }
      
      console.log('✅ Successfully signed out from Supabase');
      
      setSession(null);
      setUser(null);
      
      // Clear stored user data
      if (isNative) {
        await Preferences.remove({ key: 'pitara_user' });
      } else {
        localStorage.removeItem('pitara_user');
      }
      
      showToast({ message: 'Successfully logged out', type: 'success' });
    } catch (error) {
      console.error('💥 Error signing out:', error);
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
