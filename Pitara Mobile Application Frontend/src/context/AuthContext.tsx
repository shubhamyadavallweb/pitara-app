import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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

// Safely check if we're on a native platform
const isNative = () => {
  try {
    // @ts-ignore - Capacitor may not be available during build
    return typeof window !== 'undefined' && 
           window.Capacitor?.getPlatform && 
           window.Capacitor.getPlatform() !== 'web';
  } catch {
    return false;
  }
};

const getRedirectUrl = () => {
  if (isNative()) {
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
    console.log('=== DEEP LINK HANDLER ===');
    console.log('URL:', url);

    if (!url) {
      console.log('No URL provided to deep link handler');
      setIsLoading(false);
      return;
    }

    // Force close browser if possible
    if (isNative()) {
      try {
        // @ts-ignore - Dynamic import for Capacitor
        const { Browser } = await import('@capacitor/browser');
        console.log('Closing browser');
        await Browser.close();
      } catch (err) {
        console.log('Error closing browser:', err);
      }
    }

    // Try to get session directly first
    try {
      console.log('Checking for existing session after deep link');
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        console.log('Found active session!');
        const transformedUser = transformSupabaseUser(sessionData.session.user);
        setUser(transformedUser);
        localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error('Error checking session:', err);
    }

    // Parse tokens from URL as fallback
    let accessToken = null;
    let refreshToken = null;

    try {
      // Check hash fragment
      if (url.includes('#')) {
        const params = new URLSearchParams(url.substring(url.indexOf('#') + 1));
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
        console.log('Tokens from hash:', !!accessToken, !!refreshToken);
      }

      // Check query parameters
      if ((!accessToken || !refreshToken) && url.includes('?')) {
        const params = new URLSearchParams(url.substring(url.indexOf('?') + 1));
        accessToken = accessToken || params.get('access_token');
        refreshToken = refreshToken || params.get('refresh_token');
        console.log('Tokens from query:', !!accessToken, !!refreshToken);
      }

      // Try setting session if we have tokens
      if (accessToken && refreshToken) {
        console.log('Setting session with extracted tokens');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error && data.user) {
          const transformedUser = transformSupabaseUser(data.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          console.log('User authenticated via tokens');
        } else {
          console.error('Error setting session:', error);
        }
      }
    } catch (err) {
      console.error('Error parsing tokens:', err);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    console.log('=== INITIALIZING AUTH ===');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Found existing session');
          const transformedUser = transformSupabaseUser(session.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        } else {
          console.log('No existing session, checking localStorage');
          // Fallback to localStorage
          const storedUser = localStorage.getItem('pitara_user');
          if (storedUser) {
            try {
              const parsedUser: User = JSON.parse(storedUser);
              if (parsedUser && parsedUser.id) {
                setUser(parsedUser);
                console.log('Restored user from localStorage');
              }
            } catch (err) {
              console.error('Failed to parse stored user:', err);
              localStorage.removeItem('pitara_user');
            }
          }
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Handle auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('=== AUTH STATE CHANGE ===');
        console.log('Event:', event);
        console.log('Session exists:', !!session);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in successfully');
          const transformedUser = transformSupabaseUser(session.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          setIsLoading(false);

          // Close browser if we're on native
          if (isNative()) {
            try {
              // @ts-ignore - Dynamic import
              const { Browser } = await import('@capacitor/browser');
              await Browser.close();
            } catch (e) {
              console.log('Error closing browser after sign in:', e);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setUser(null);
          localStorage.removeItem('pitara_user');
          setIsLoading(false);
        } else if (session?.user) {
          console.log('Session updated');
          const transformedUser = transformSupabaseUser(session.user);
          setUser(transformedUser);
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
          setIsLoading(false);
        } else {
          console.log('No session found');
          setIsLoading(false);
        }
      }
    );

    // Handle deep links for native apps
    if (isNative()) {
      console.log('Setting up native deep link handlers');
      
      // Check for launch URL
      // @ts-ignore - Dynamic import
      import('@capacitor/app').then(({ App: CapacitorApp }) => {
        CapacitorApp.getLaunchUrl().then(launchData => {
          if (launchData?.url) {
            console.log('Launch URL detected:', launchData.url);
            handleDeepLink(launchData.url);
          }
        });

        // Listen for URL opens
        const listener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
          console.log('App URL open detected:', url);
          handleDeepLink(url);
        });

        return () => {
          listener.then(l => l.remove());
        };
      }).catch(err => {
        console.error('Error setting up native handlers:', err);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('=== GOOGLE SIGN IN ===');
      setIsLoading(true);

      const redirectUrl = getRedirectUrl();
      console.log('Using redirect URL:', redirectUrl);

      // Clear existing session
      await supabase.auth.signOut();
      localStorage.removeItem('pitara_user');

      if (isNative()) {
        console.log('Starting native OAuth flow');
        
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
          console.error('OAuth error:', error);
          throw error;
        }

        if (data?.url) {
          console.log('Opening OAuth URL:', data.url);
          
          // Set timeout to prevent infinite loading
          const timeoutId = setTimeout(() => {
            console.log('OAuth timeout reached');
            setIsLoading(false);
          }, 60000); // 1 minute timeout

          try {
            // @ts-ignore - Dynamic import
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url: data.url });
            
            // Clear timeout if browser opens successfully
            clearTimeout(timeoutId);
          } catch (browserError) {
            console.error('Error opening browser:', browserError);
            clearTimeout(timeoutId);
            setIsLoading(false);
            throw browserError;
          }
        } else {
          console.error('No OAuth URL returned');
          setIsLoading(false);
          throw new Error('No OAuth URL returned');
        }
      } else {
        console.log('Starting web OAuth flow');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              prompt: 'select_account'
            }
          }
        });

        if (error) {
          console.error('Web OAuth error:', error);
          setIsLoading(false);
          throw error;
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
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
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = (userData: User) => {
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
      console.log('Fallback logout performed');
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

export default AuthProvider;
