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
    
    // Parse tokens from both fragment and query parameters
    let accessToken = null;
    let refreshToken = null;
    
    // First check for hash fragment
    if (url.includes('#')) {
      const queryString = url.substring(url.indexOf('#') + 1);
      const params = new URLSearchParams(queryString);
      
      accessToken = params.get('access_token');
      refreshToken = params.get('refresh_token');
      
      console.log('Found tokens in hash fragment:', !!accessToken, !!refreshToken);
    }
    
    // If not in fragment, check query params
    if (!accessToken && !refreshToken && url.includes('?')) {
      console.log('Trying to parse URL with query parameters');
      const queryString = url.substring(url.indexOf('?') + 1);
      const params = new URLSearchParams(queryString);
      
      accessToken = params.get('access_token');
      refreshToken = params.get('refresh_token');
      
      console.log('Found tokens in query parameters:', !!accessToken, !!refreshToken);
    }
    
    // Try to close browser first to improve UX
    if (Capacitor.getPlatform() !== 'web') {
      try {
        const { Browser } = await import('@capacitor/browser');
        console.log('Attempting to close browser early');
        await Browser.close();
      } catch (err) {
        console.log('Error closing browser early:', err);
      }
    }
    
    // Handle authentication if tokens are found
    if (accessToken && refreshToken) {
      console.log('Setting session with tokens');
      try {
        // Set the session in Supabase
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Error setting session from tokens:', error);
        } else {
          console.log('Session set successfully:', data);
          
          if (data.user) {
            const transformedUser = transformSupabaseUser(data.user);
            setUser(transformedUser);
            localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
            console.log('User authenticated successfully:', transformedUser);
            
            // Force close browser again to ensure it's closed
            if (Capacitor.getPlatform() !== 'web') {
              try {
                const { Browser } = await import('@capacitor/browser');
                console.log('Forcing browser close after authentication');
                await Browser.close();
              } catch (err) {
                console.log('Error closing browser after auth:', err);
              }
            }
          }
        }
      } catch (err) {
        console.error('Unexpected error during session setup:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.warn('No tokens found in deep link URL');
      setIsLoading(false);
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
        
        // Clear any existing session to prevent state conflicts
        await supabase.auth.signOut();
        
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
          
          // Set a timeout to reset loading state if no callback is received
          const authTimeoutId = setTimeout(() => {
            console.log('Authentication timed out after 2 minutes');
            setIsLoading(false);
          }, 120000); // 2 minute timeout
          
          try {
            await Browser.open({ url: data.url });
            console.log('Browser opened successfully');
            
            // Listen for the appUrlOpen event with a timeout
            const authPromise = new Promise<void>((resolve) => {
              const authListener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
                console.log('App opened via URL:', url);
                if (url?.includes('pitara://auth/callback')) {
                  console.log('Auth callback received');
                  clearTimeout(authTimeoutId);
                  authListener.remove();
                  resolve();
                }
              });
              
              // Cleanup if the component unmounts
              return () => {
                authListener.remove();
                clearTimeout(authTimeoutId);
              };
            });
            
            // Don't wait for the promise to resolve, let the deep link handler manage the state
          } catch (browserError) {
            console.error('Error opening browser:', browserError);
            clearTimeout(authTimeoutId);
            setIsLoading(false);
            throw browserError;
          }
        } else {
          console.error('No URL returned from signInWithOAuth');
          setIsLoading(false);
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
          setIsLoading(false);
          throw error;
        }
        console.log('Web OAuth flow initialized, page will redirect');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setIsLoading(false);
      throw error;
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
