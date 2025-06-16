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
      // For native mobile apps, always use the app's deep link scheme
      return 'pitara://auth/callback';
    } else {
      // For web, use Supabase callback
      return `${window.location.origin}`;
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
        // Extract tokens from URL if present
        console.log('🔍 Extracting tokens from URL...');
        
        let attempts = 0;
        const maxAttempts = 5;
        const checkForSession = async () => {
          attempts++;
          console.log(`🔄 Attempt ${attempts}/${maxAttempts} - Checking for session...`);
          
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
              message: `🎉 Welcome ${transformedUser.name}! Login successful!`, 
              type: 'success' 
            });
            
            setIsLoading(false);
            return;
          } 
          
          // If no session found and still have attempts left, retry
          if (attempts < maxAttempts) {
            console.log(`⏳ No session found, retrying in ${attempts}s...`);
            setTimeout(checkForSession, attempts * 1000);
          } else {
            console.log('⚠️ No session found after all attempts');
            showToast({ 
              message: 'Authentication timed out. Please try again.', 
              type: 'error' 
            });
            setIsLoading(false);
          }
        };
        
        // Start checking for session
        setTimeout(checkForSession, 500);
        
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
      console.log('🔄 Auth state changed:', event, session ? 'Session found' : 'No session');
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User successfully signed in!');
        const transformedUser = transformSupabaseUser(session.user);
        setSession(session);
        setUser(transformedUser);
        
        // Store user data for persistence
        if (isNative) {
          await Preferences.set({ key: 'pitara_user', value: JSON.stringify(transformedUser) });
        } else {
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
        }
        
        // Show success message and stop loading
        showToast({ 
          message: `🎉 Welcome ${transformedUser.name}! You're now logged in!`, 
          type: 'success' 
        });
        setIsLoading(false);
        
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setSession(null);
        setUser(null);
        if (isNative) {
          await Preferences.remove({ key: 'pitara_user' });
        } else {
          localStorage.removeItem('pitara_user');
        }
        setIsLoading(false);
        
      } else if (session) {
        // Handle other session events (like token refresh)
        const transformedUser = transformSupabaseUser(session.user);
        setSession(session);
        setUser(transformedUser);
        if (isNative) {
          await Preferences.set({ key: 'pitara_user', value: JSON.stringify(transformedUser) });
        } else {
          localStorage.setItem('pitara_user', JSON.stringify(transformedUser));
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

  // 🚨 TEMPORARY BYPASS: Google authentication disabled for testing
  // TODO: Re-enable Google OAuth after testing all app features
  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 === TEMPORARY BYPASS: GOOGLE SIGN-IN DEMO MODE ===');
      
      // Create a temporary demo user for testing all app features
      const demoUser: User = {
        id: 'demo-user-' + Date.now(),
        email: 'demo@pitara.com',
        name: 'Demo User',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        role: 'user'
      };
      
      // Simulate a brief loading time to make it feel natural
      setTimeout(async () => {
        // Set the demo user as authenticated
        setUser(demoUser);
        setSession({
          access_token: 'demo-token',
          refresh_token: 'demo-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: demoUser.id,
            email: demoUser.email,
            user_metadata: {
              full_name: demoUser.name,
              avatar_url: demoUser.avatar
            },
            app_metadata: {
              role: demoUser.role
            }
          }
        } as any);
        
        // Store user data for persistence
        if (isNative) {
          await Preferences.set({ key: 'pitara_user', value: JSON.stringify(demoUser) });
        } else {
          localStorage.setItem('pitara_user', JSON.stringify(demoUser));
        }
        
        console.log('✅ Demo user logged in successfully');
        showToast({ 
          message: `🎉 Welcome ${demoUser.name}! You're now in demo mode!`, 
          type: 'success' 
        });
        
        setIsLoading(false);
      }, 1500); // 1.5 seconds delay to simulate authentication
      
    } catch (error: any) {
      console.error('💥 Error in demo sign-in:', error);
      showToast({ message: 'Failed to sign in. Please try again.', type: 'error' });
      setIsLoading(false);
    }
    
    console.log('🏁 === DEMO SIGN-IN END ===');
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
