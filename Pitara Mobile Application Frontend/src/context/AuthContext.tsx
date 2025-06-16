import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const isNative = Capacitor?.getPlatform && Capacitor.getPlatform() !== 'web';

const getRedirectUrl = () => {
  if (isNative) {
    return 'pitara://auth/callback';
  }
  return `${window.location.origin}/`;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const transformSupabaseUser = (supabaseUser: SupabaseUser): User => {
    const fullName = supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || '';
    return {
      id: supabaseUser.id,
      name: fullName,
      email: supabaseUser.email || '',
      avatar: supabaseUser.user_metadata?.avatar_url,
      firstName: fullName.split(' ')[0] || '',
      lastName: fullName.split(' ').slice(1).join(' ') || '',
    };
  };

  const handleDeepLink = async (url: string | null) => {
    if (!url) {
      console.log('Deep link handler called with no URL');
      return;
    }
    
    console.log('Handling deep link URL:', url);
    
    // Check if URL contains hash fragment
    if (!url.includes('#')) {
      console.log('Deep link URL does not contain fragment identifier (#)');
      
      // Try to handle URL format that might use ? instead of #
      if (url.includes('?')) {
        console.log('Trying to parse URL with query parameters instead of fragment');
        const queryString = url.substring(url.indexOf('?') + 1);
        const params = new URLSearchParams(queryString);
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken && refreshToken) {
          console.log('Found tokens in URL query parameters, setting session');
          await setSessionFromTokens(accessToken, refreshToken);
          return;
        } else {
          console.log('No tokens found in query parameters');
        }
      }
      return;
    }

    const queryString = url.substring(url.indexOf('#') + 1);
    const params = new URLSearchParams(queryString);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    
    if (accessToken && refreshToken) {
      console.log('Found tokens in URL fragment, setting session');
      await setSessionFromTokens(accessToken, refreshToken);
    } else {
      console.warn('No access_token or refresh_token found in the deep link URL fragment', 
        Array.from(params.entries()).map(([key]) => key).join(', '));
    }
  };

  // Helper function to set session from tokens
  const setSessionFromTokens = async (accessToken: string, refreshToken: string) => {
    console.log('Setting session with tokens');
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Error setting session from tokens:', error);
      } else {
        console.log('Session set successfully:', data);
        // The onAuthStateChange listener will now fire with SIGNED_IN
        // and update the user state.
        if (data.user) {
          const transformedUser = transformSupabaseUser(data.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          console.log('User data stored in local state:', transformedUser);
        }
        // Attempt to close the browser tab if it's still open
        if (Capacitor.getPlatform() !== 'web') {
          const { Browser } = await import('@capacitor/browser');
          Browser.close();
        }
      }
    } catch (err) {
      console.error('Unexpected error during session setup:', err);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const transformedUser = transformSupabaseUser(session.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          console.log('User authenticated:', transformedUser);
        } else {
          // Fallback to legacy localStorage auth (pre-Supabase login)
          const storedUser = localStorage.getItem('pitara_user');
          if (storedUser) {
            try {
              const parsedUser: User = JSON.parse(storedUser);
              if (parsedUser && parsedUser.id) {
                setUser(parsedUser);
                localStorage.setItem('pitara_user', JSON.stringify(parsedUser));
                console.log('User authenticated via localStorage fallback:', parsedUser);
              }
            } catch (err) {
              console.error('Failed to parse legacy user from localStorage', err);
            }
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Handle deep link if app was cold-started from OAuth redirect
    if (isNative) {
      CapacitorApp.getLaunchUrl().then(launchData => {
        if (launchData?.url) {
          handleDeepLink(launchData.url);
        }
      });
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (session?.user) {
          const transformedUser = transformSupabaseUser(session.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        } else {
          // Clear user state on sign out; no localStorage fallback to prevent unauthorized access
          setUser(null);
          localStorage.removeItem('pitara_user');
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isNative) {
      // Listen for deep-link when the app is opened from the background or closed state
      const sub = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        handleDeepLink(url);
      });
      return () => {
        // @ts-ignore
        sub?.remove();
      };
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      
      if (isNative) {
        console.log('Starting native Google sign-in flow');
        const { Browser } = await import('@capacitor/browser');
        
        const redirectUrl = 'pitara://auth/callback';
        console.log(`Using redirect URL: ${redirectUrl}`);
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
            queryParams: {
              prompt: 'select_account'
            }
          }
        });
        
        if (error) {
          console.error('Error initiating OAuth flow:', error);
          throw error;
        }
        
        if (data?.url) {
          console.log('Opening browser with URL:', data.url);
          
          try {
            await Browser.open({ url: data.url });
            console.log('Browser opened successfully');
            // After this, the app will be backgrounded. The deep link listeners
            // will handle the redirect back.
          } catch (browserError) {
            console.error('Error opening browser:', browserError);
            throw browserError;
          }
        } else {
          console.error('No URL returned from signInWithOAuth');
          throw new Error('No URL returned from signInWithOAuth');
        }
      } else {
        // For web, use the standard flow
        console.log('Starting web Google sign-in flow');
        const webRedirectUrl = getRedirectUrl();
        console.log(`Using web redirect URL: ${webRedirectUrl}`);
        
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: webRedirectUrl,
            queryParams: {
              prompt: 'select_account'
            }
          }
        });
        
        if (error) {
          console.error('Error with web OAuth flow:', error);
          throw error;
        }
        console.log('Web OAuth flow initialized, page will redirect');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      localStorage.removeItem('pitara_user');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      console.log('User signed out');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User) => {
    // Keep for backward compatibility with existing login screen
    setUser(userData);
    localStorage.setItem('pitara_user', JSON.stringify(userData));
    console.log('User logged in (legacy):', userData);
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (error) {
      // Fallback to local logout
      setUser(null);
      localStorage.removeItem('pitara_user');
      console.log('User logged out');
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      
      // Update Supabase profile
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
