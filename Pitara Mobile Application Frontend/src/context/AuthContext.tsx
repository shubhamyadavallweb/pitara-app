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
      CapacitorApp.getLaunchUrl().then(async (launchData) => {
        const url = (launchData as any)?.url ?? '';
        console.log('App launched with URL:', url);
        if (url && url.startsWith('pitara://auth/callback')) {
          try {
            console.log('Processing cold start auth callback URL:', url);
            const { data, error } = await supabase.auth.exchangeCodeForSession(url);
            if (error) {
              console.error('Error exchanging code for session on cold start', error);
            } else {
              console.log('Session obtained on cold start', data);
              // Force UI update
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const transformedUser = transformSupabaseUser(user);
                setUser(transformedUser);
                localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
                console.log('User authenticated via cold start:', transformedUser);
              }
            }
          } catch (err) {
            console.error('Deep link handling failed on cold start', err);
          }
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
        console.log('App opened with URL:', url);
        if (url && url.startsWith('pitara://auth/callback')) {
          try {
            console.log('Processing auth callback URL:', url);
            const { data, error } = await supabase.auth.exchangeCodeForSession(url);
            if (error) {
              console.error('Error exchanging code for session', error);
            } else {
              console.log('Session obtained via deep link', data);
              // Force UI update
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const transformedUser = transformSupabaseUser(user);
                setUser(transformedUser);
                localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
                console.log('User authenticated via deep link:', transformedUser);
              }
            }
          } catch (err) {
            console.error('Deep link handling failed', err);
          }
        }
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
        // For native mobile, use Browser plugin with explicit handling
        const { Browser } = await import('@capacitor/browser');
        
        // Create a promise that will resolve when the app is opened via deep link
        const authCompletedPromise = new Promise<void>((resolve) => {
          const authStateChangeListener = supabase.auth.onAuthStateChange((event) => {
            console.log('Auth state changed in promise:', event);
            if (event === 'SIGNED_IN') {
              // User is signed in, resolve the promise
              resolve();
              // Remove the listener
              authStateChangeListener.data.subscription.unsubscribe();
            }
          });
          
          // Set a timeout to reject the promise after 5 minutes (300000ms)
          setTimeout(() => {
            console.log('Auth timeout reached');
            authStateChangeListener.data.subscription.unsubscribe();
            resolve(); // Just resolve anyway to avoid hanging
          }, 300000);
        });
        
        // Start the OAuth flow
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'pitara://auth/callback',
            skipBrowserRedirect: true,
            queryParams: {
              prompt: 'select_account'
            }
          }
        });
        
        if (error) throw error;
        
        if (data?.url) {
          // Open the browser with the OAuth URL
          await Browser.open({ url: data.url });
          
          // Wait for authentication to complete via deep link
          await authCompletedPromise;
          
          // Close the browser if it's still open
          await Browser.close();
        }
      } else {
        // For web, use the standard flow
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`,
            queryParams: {
              prompt: 'select_account'
            }
          }
        });
        
        if (error) throw error;
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
