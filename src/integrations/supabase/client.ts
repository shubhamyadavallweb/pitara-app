import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "https://jdfnkvbfpvzddjtgiovj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZm5rdmJmcHZ6ZGRqdGdpb3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3ODE5OTcsImV4cCI6MjA2NTM1Nzk5N30.zHUA-ESeIWzsfEpkt6O7-nWOBLaBf8MCEQlUb2JcnOI";

const isNative = Capacitor.isNativePlatform();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    autoRefreshToken: true,
    persistSession: true,
    debug: (message) => {
      console.log('Supabase Auth Debug:', message);
    },
    storage: {
      getItem: async (key) => {
        try {
          if (isNative) {
            const { value } = await Preferences.get({ key });
            console.log(`Retrieved auth item: ${key} - ${value ? 'Found' : 'Not found'}`);
            return value;
          } else {
            const value = localStorage.getItem(key);
            console.log(`Retrieved auth item: ${key} - ${value ? 'Found' : 'Not found'}`);
            return value;
          }
        } catch (error) {
          console.error('Error getting auth session:', error);
          return null;
        }
      },
      setItem: async (key, value) => {
        try {
          if (isNative) {
            await Preferences.set({ key, value });
          } else {
            localStorage.setItem(key, value);
          }
          console.log(`Stored auth item: ${key}`);
        } catch (error) {
          console.error('Error storing auth session:', error);
        }
      },
      removeItem: async (key) => {
        try {
          if (isNative) {
            await Preferences.remove({ key });
          } else {
            localStorage.removeItem(key);
          }
          console.log(`Removed auth item: ${key}`);
        } catch (error) {
          console.error('Error removing auth session:', error);
        }
      },
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'pitara-mobile-app'
    }
  }
}); 