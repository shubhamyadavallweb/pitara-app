import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { showToast } from '@/utils/feedback';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

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
        localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        setIsLoading(false);
        return; // Exit early if we found the session
      }
      
      // If no session, manually handle exchanging the URL for session
      const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken && refreshToken) {
        console.log('Found tokens in URL, setting session');
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (sessionError) {
          console.error('Error setting session from URL tokens:', sessionError);
        } else if (sessionData?.user) {
          console.log('Successfully set session from URL tokens');
          const transformedUser = transformSupabaseUser(sessionData.user);
          setSession(sessionData.session);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        }
      } else {
        // Handle session exchange using code if present (PKCE flow)
        if (url.includes('code=')) {
          console.log('Auth code found in URL - Supabase should handle PKCE exchange automatically');
          // Supabase should handle this automatically with detectSessionInUrl: true
        }
      }
    } catch (err) {
      console.error('Error processing deep link:', err);
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
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          console.log('User authenticated from session', transformedUser.email);
        } else {
          // Check localStorage fallback
          const storedUser = localStorage.getItem('pitara_user');
          if (storedUser) {
            try {
              const parsedUser: User = JSON.parse(storedUser);
              if (parsedUser && parsedUser.id) {
                setUser(parsedUser);
                console.log('User authenticated from localStorage', parsedUser.email);
              }
            } catch (err) {
              console.error('Failed to parse user from localStorage', err);
            }
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
    }

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, !!currentSession?.user?.email);
        
        if (currentSession) {
          setSession(currentSession);
          const transformedUser = transformSupabaseUser(currentSession.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          console.log('User authenticated via state change', transformedUser.email);
        } else {
          setSession(null);
          setUser(null);
          localStorage.removeItem('pitara_user');
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isNative]);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 === GOOGLE SIGN-IN DEBUG START ===');

      if (isNative) {
        // Native (Android/iOS) flow – leverages Google Play Services account chooser
        try {
          console.log('📱 Platform: Native (Android/iOS)');
          console.log('🔧 Initializing GoogleAuth plugin...');
          
          // Ensure plugin is initialised (safe to call multiple times)
          await GoogleAuth.initialize();
          console.log('✅ GoogleAuth plugin initialized successfully');

          console.log('🎯 Launching Google account picker...');
          // Launch the native account-picker UI
          const googleUser = await GoogleAuth.signIn();
          
          console.log('📋 === COMPLETE GOOGLE USER RESPONSE ===');
          console.log('Full GoogleUser object:', JSON.stringify(googleUser, null, 2));
          console.log('GoogleUser email:', googleUser?.email);
          console.log('GoogleUser authentication object:', JSON.stringify(googleUser?.authentication, null, 2));

          // Check authentication object structure
          const auth = googleUser?.authentication;
          if (!auth) {
            console.error('❌ Authentication object is missing from Google response');
            throw new Error('No authentication data received from Google');
          }

          console.log('🔍 === TOKEN ANALYSIS ===');
          console.log('auth.idToken:', auth.idToken ? `Present (${auth.idToken.length} chars)` : 'NULL/MISSING');
          console.log('auth.id_token:', auth.id_token ? `Present (${auth.id_token.length} chars)` : 'NULL/MISSING');
          console.log('auth.accessToken:', auth.accessToken ? `Present (${auth.accessToken.length} chars)` : 'NULL/MISSING');
          console.log('auth.access_token:', auth.access_token ? `Present (${auth.access_token.length} chars)` : 'NULL/MISSING');

          // Try different token properties
          const idToken = auth.idToken || auth.id_token;
          const accessToken = auth.accessToken || auth.access_token;

          console.log('🎯 Final tokens selected:');
          console.log('idToken (final):', idToken ? `Present (${idToken.length} chars)` : 'NULL/MISSING');
          console.log('accessToken (final):', accessToken ? `Present (${accessToken.length} chars)` : 'NULL/MISSING');

          if (!idToken) {
            console.error('❌ CRITICAL: No ID token found in Google response');
            console.error('Available keys in auth object:', Object.keys(auth));
            throw new Error('Failed to retrieve ID token from Google Sign-In - check Web Client ID configuration');
          }

          console.log('🔗 === SUPABASE INTEGRATION START ===');
          console.log('Attempting Supabase signInWithIdToken...');
          console.log('Provider: google');
          console.log('Token length:', idToken.length);
          console.log('Access token present:', !!accessToken);

          // Exchange the native tokens for a Supabase session
          const supabasePayload = {
            provider: 'google',
            token: idToken,
            ...(accessToken && { access_token: accessToken }), // Only include if available
          };
          
          console.log('📤 Supabase payload:', JSON.stringify(supabasePayload, null, 2));
          
          const { data, error } = await supabase.auth.signInWithIdToken(supabasePayload);

          console.log('📥 === SUPABASE RESPONSE ANALYSIS ===');
          console.log('Response data:', data ? 'Present' : 'NULL');
          console.log('Response error:', error ? error.message : 'None');
          
          if (data) {
            console.log('✅ Data structure:');
            console.log('- User present:', !!data.user);
            console.log('- Session present:', !!data.session);
            console.log('- User email:', data.user?.email);
            console.log('- User ID:', data.user?.id);
            console.log('- Session access_token:', data.session?.access_token ? 'Present' : 'Missing');
          }

          if (error) {
            console.error('❌ SUPABASE ERROR DETAILS:');
            console.error('Error message:', error.message);
            console.error('Error code:', error.status);
            console.error('Full error object:', JSON.stringify(error, null, 2));
            showToast({ message: `Supabase Login failed: ${error.message}`, type: 'error' });
          } else if (data?.user && data?.session) {
            console.log('🎉 === SUCCESS: AUTHENTICATION COMPLETE ===');
            // The session will be handled by the auth state change listener
            // But let's also manually set it to ensure immediate UI update
            const transformedUser = transformSupabaseUser(data.user);
            console.log('👤 Transformed user:', JSON.stringify(transformedUser, null, 2));
            
            setSession(data.session);
            setUser(transformedUser);
            localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
            
            console.log('💾 User saved to localStorage');
            console.log('🔄 Auth state updated');
            
            showToast({ message: `Welcome ${transformedUser.name}!`, type: 'success' });
          } else {
            console.warn('⚠️ PARTIAL SUCCESS: Supabase responded but missing user/session');
            console.warn('Data received:', JSON.stringify(data, null, 2));
            showToast({ message: 'Login succeeded but session not created. Please try again.', type: 'warning' });
          }
        } catch (nativeErr: any) {
          console.error('💥 === NATIVE GOOGLE SIGN-IN ERROR ===');
          console.error('Error type:', typeof nativeErr);
          console.error('Error message:', nativeErr?.message);
          console.error('Error code:', nativeErr?.code);
          console.error('Full error object:', JSON.stringify(nativeErr, null, 2));
          showToast({ message: nativeErr?.message || 'Native sign-in failed', type: 'error' });
        }
      } else {
        // Web / PWA flow – fall back to regular OAuth in browser
        console.log('🌐 Platform: Web/PWA');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: getRedirectUrl(),
            queryParams: {
              prompt: 'select_account',
              access_type: 'offline'
            }
          }
        });

        if (error) {
          console.error('Error with OAuth flow:', error);
          showToast({ message: `Login failed: ${error.message}`, type: 'error' });
        }
      }
    } catch (error) {
      console.error('💥 === TOP-LEVEL GOOGLE SIGN-IN ERROR ===');
      console.error('Error signing in with Google:', error);
      showToast({ message: 'Failed to sign in. Please try again.', type: 'error' });
    } finally {
      setIsLoading(false);
      console.log('🏁 === GOOGLE SIGN-IN DEBUG END ===');
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setSession(null);
      setUser(null);
      localStorage.removeItem('pitara_user');
      showToast({ message: 'Successfully logged out', type: 'success' });
    } catch (error) {
      console.error('Error signing out:', error);
      showToast({ message: 'Failed to sign out', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('pitara_user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      setUser(null);
      localStorage.removeItem('pitara_user');
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
      
      localStorage.setItem('pitara_user', JSON.stringify(updatedUser));
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
