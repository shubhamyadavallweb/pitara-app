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

    // Immediately try to close browser to improve UX
    if (Capacitor.getPlatform() !== 'web') {
      try {
        const { Browser } = await import('@capacitor/browser');
        console.log('Attempting to close browser immediately');
        await Browser.close();
      } catch (err) {
        console.log('Error closing browser early:', err);
      }
    }
    
    // Parse tokens from all possible formats
    let accessToken = null;
    let refreshToken = null;
    
    // Try all possible token extraction methods
    try {
      // Method 1: Check for hash fragment
      if (url.includes('#')) {
        const queryString = url.substring(url.indexOf('#') + 1);
        const params = new URLSearchParams(queryString);
        
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
        
        console.log('Found tokens in hash fragment:', !!accessToken, !!refreshToken);
      }
      
      // Method 2: Check for query parameters
      if ((!accessToken || !refreshToken) && url.includes('?')) {
        console.log('Trying to parse URL with query parameters');
        const queryString = url.substring(url.indexOf('?') + 1);
        const params = new URLSearchParams(queryString);
        
        accessToken = accessToken || params.get('access_token');
        refreshToken = refreshToken || params.get('refresh_token');
        
        console.log('Found tokens in query parameters:', !!accessToken, !!refreshToken);
      }
      
      // Method 3: Try parsing the entire URL as query string (some OAuth providers format differently)
      if (!accessToken || !refreshToken) {
        const fullUrlParams = new URLSearchParams(url);
        accessToken = accessToken || fullUrlParams.get('access_token');
        refreshToken = refreshToken || fullUrlParams.get('refresh_token');
        console.log('Found tokens in full URL parsing:', !!accessToken, !!refreshToken);
      }
      
      // Method 4: Look for "code" parameter for auth code flow
      let code = null;
      if ((!accessToken || !refreshToken) && url.includes('code=')) {
        const codeMatch = url.match(/code=([^&]+)/);
        if (codeMatch && codeMatch[1]) {
          code = codeMatch[1];
          console.log('Found auth code in URL');
        }
      }

      // If we have a code but no tokens, try to exchange it
      if (code && (!accessToken || !refreshToken)) {
        console.log('Attempting to exchange auth code for tokens');
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data) {
            console.log('Successfully exchanged code for session');
            // Session is automatically set by Supabase client
            
            if (data.session?.access_token && data.session?.refresh_token) {
              accessToken = data.session.access_token;
              refreshToken = data.session.refresh_token;
            }
          } else {
            console.error('Error exchanging code for session:', error);
          }
        } catch (err) {
          console.error('Exception exchanging code for tokens:', err);
        }
      }
    } catch (parseErr) {
      console.error('Error parsing URL for tokens:', parseErr);
    }
    
    // Try to retrieve session directly - might work even without tokens from URL
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session && (!accessToken || !refreshToken)) {
        console.log('Found active session in Supabase client');
        accessToken = sessionData.session.access_token;
        refreshToken = sessionData.session.refresh_token;
      }
    } catch (err) {
      console.error('Error getting existing session:', err);
    }
    
    // Force close browser again
    if (Capacitor.getPlatform() !== 'web') {
      try {
        const { Browser } = await import('@capacitor/browser');
        console.log('Forcing browser close after token extraction');
        await Browser.close();
      } catch (err) {
        console.log('Error closing browser after token extraction:', err);
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
          
          // Try recovery - get session one more time
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              console.log('Recovered session after setSession error');
              const transformedUser = transformSupabaseUser(sessionData.session.user);
              setUser(transformedUser);
              localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
            }
          } catch (recoveryErr) {
            console.error('Recovery attempt failed:', recoveryErr);
          }
        } else {
          console.log('Session set successfully:', data);
          
          if (data.user) {
            const transformedUser = transformSupabaseUser(data.user);
            setUser(transformedUser);
            localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
            console.log('User authenticated successfully:', transformedUser);
          }
        }
      } catch (err) {
        console.error('Unexpected error during session setup:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.warn('No tokens found in deep link URL');
      
      // Try one more time to get session
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          console.log('Found user in session despite no tokens in URL');
          const transformedUser = transformSupabaseUser(sessionData.session.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        }
      } catch (err) {
        console.error('Final session check failed:', err);
      }
      
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
          console.log('=== COLD START DEEP LINK ===');
          console.log('Launch URL:', launchData.url);
          handleDeepLink(launchData.url);
        }
      });
    }

    // Listen for auth changes - this is the key for automatic login after OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('=== AUTH STATE CHANGE ===');
        console.log('Event:', event, 'User:', session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in via OAuth!');
          const transformedUser = transformSupabaseUser(session.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          setIsLoading(false);
          
          // Force close any open browser
          if (isNative) {
            try {
              const { Browser } = await import('@capacitor/browser');
              console.log('Closing browser after successful sign in');
              await Browser.close();
            } catch (e) {
              console.log('Error closing browser after sign in:', e);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear user state on sign out
          setUser(null);
          localStorage.removeItem('pitara_user');
          setIsLoading(false);
        } else if (session?.user) {
          // Handle other auth state changes
          const transformedUser = transformSupabaseUser(session.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isNative) {
      // Listen for deep-link when the app is opened from the background or closed state
      const sub = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
        console.log('=== APP URL OPEN EVENT ===');
        console.log('Received URL:', url);
        
        // Force close browser immediately when we get any pitara:// URL
        try {
          const { Browser } = await import('@capacitor/browser');
          console.log('Force closing browser on URL open');
          await Browser.close();
        } catch (e) {
          console.log('Error closing browser on URL open:', e);
        }
        
        // Try to get session immediately - sometimes the session is already set by Supabase
        try {
          console.log('Checking for existing session after URL open');
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            console.log('Found active session immediately after URL open!');
            const transformedUser = transformSupabaseUser(sessionData.session.user);
            setUser(transformedUser);
            localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
            setIsLoading(false);
            return; // Exit early if we found the session
          }
        } catch (e) {
          console.log('Error checking immediate session:', e);
        }
        
        // If no immediate session, try the deep link handler
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
        
        // Use multiple redirect formats to ensure compatibility
        const redirectUrl = 'pitara://auth/callback';
        console.log(`Using redirect URL: ${redirectUrl}`);
        
        // Ensure we're clean starting
        console.log('Clearing any existing sessions before authentication');
        localStorage.removeItem('pitara_user');
        await supabase.auth.signOut();
        
        // Add delay to ensure session is fully cleared
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create shorter timeout to handle browser hanging cases
        const browserTimeoutId = setTimeout(() => {
          console.log('Browser open timeout - forcing close');
          Browser.close().catch(e => console.error('Error closing browser on timeout:', e));
        }, 45000); // 45 second timeout for browser hanging
        
        // Configure shorter main timeout 
        const authTimeoutId = setTimeout(() => {
          console.log('Authentication timed out');
          setIsLoading(false);
          Browser.close().catch(e => console.error('Error closing browser on auth timeout:', e));
        }, 90000); // 1.5 minute timeout
        
        try {
          console.log('Initiating OAuth flow with Supabase');
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              skipBrowserRedirect: true,
              queryParams: {
                prompt: 'select_account',
                access_type: 'offline', // Request refresh token
                client_id: '1089697091920-98q7tp993p275ms9dbms9iodu5lh8rnp.apps.googleusercontent.com' // Explicitly specify client ID
              }
            }
          });
          
          if (error) {
            console.error('Error initiating OAuth flow:', error);
            clearTimeout(browserTimeoutId);
            clearTimeout(authTimeoutId);
            setIsLoading(false);
            throw error;
          }
          
          if (data?.url) {
            console.log('Got OAuth URL, opening browser:', data.url);
            
            // Set up an event listener before opening browser
            const authListener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
              console.log('App opened via URL:', url);
              if (url?.startsWith('pitara://')) {
                console.log('Auth callback detected, clearing timeouts');
                clearTimeout(browserTimeoutId);
                clearTimeout(authTimeoutId);
                
                // Try closing browser more aggressively
                Browser.close().catch(e => console.log('Error closing browser after URL open:', e));
                
                // Force close the browser again after a slight delay
                setTimeout(() => {
                  Browser.close().catch(e => console.log('Error in second browser close attempt:', e));
                }, 300);
                
                // Auth listener can be removed, handleDeepLink will take over
                authListener.remove();
                
                // Now explicitly call handleDeepLink to ensure URL is processed
                handleDeepLink(url);
              }
            });
            
            // Open the browser
            await Browser.open({ 
              url: data.url,
              windowName: '_system', // Try to use system browser if available
              presentationStyle: 'fullscreen' // Fullscreen for better UX
            });
            console.log('Browser opened successfully');
            
            // After a slight delay, set up a secondary verification to check if we got logged in
            setTimeout(async () => {
              try {
                // Try to close browser as early as possible
                Browser.close().catch(e => console.log('Error closing browser in early verification check:', e));
                
                const { data: sessionCheck } = await supabase.auth.getSession();
                if (sessionCheck?.session) {
                  console.log('Found active session during verification check');
                  clearTimeout(browserTimeoutId);
                  clearTimeout(authTimeoutId);
                  
                  // Multiple attempts to close browser
                  Browser.close().catch(e => console.log('Error closing browser in verification check:', e));
                  
                  // Secondary close attempt
                  setTimeout(() => {
                    Browser.close().catch(e => console.log('Error in secondary browser close attempt:', e));
                  }, 500);
                  
                  if (sessionCheck.session.user) {
                    const transformedUser = transformSupabaseUser(sessionCheck.session.user);
                    setUser(transformedUser);
                    localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
                    setIsLoading(false);
                  }
                } else {
                  // No session found, try to force close browser anyway
                  Browser.close().catch(e => console.log('Error force closing browser with no session:', e));
                }
              } catch (verifyErr) {
                console.error('Error in verification check:', verifyErr);
                // Try to close browser even after error
                Browser.close().catch(e => console.log('Error closing browser after verification error:', e));
              }
            }, 15000); // Check after 15 seconds (reduced from 20s)
          } else {
            console.error('No URL returned from signInWithOAuth');
            clearTimeout(browserTimeoutId);
            clearTimeout(authTimeoutId);
            setIsLoading(false);
            throw new Error('No URL returned from signInWithOAuth');
          }
        } catch (initError) {
          console.error('Error during authentication initiation:', initError);
          setIsLoading(false);
          throw initError;
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
