// App Constants and Configuration
export const APP_CONFIG = {
  name: 'Pitara',
  version: '1.0.0',
  scheme: 'pitara',
  bundleId: 'com.pitara.mobile',
} as const;

// Environment Variables
export const ENV = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jdfnkvbfpvzddjtgiovj.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
  GOOGLE_ANDROID_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
  RAZORPAY_KEY: process.env.EXPO_PUBLIC_RAZORPAY_KEY || '',
  BUNNY_CDN_URL: process.env.EXPO_PUBLIC_BUNNY_CDN_URL || '',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  SUPABASE_FUNCTIONS: `${ENV.SUPABASE_URL}/functions/v1`,
  CREATE_CHECKOUT: '/create-checkout',
  VERIFY_PAYMENT: '/verify-payment',
  SEND_PUSH: '/send-push',
} as const;

// App Settings
export const SETTINGS = {
  DEFAULT_VIDEO_QUALITY: '720p',
  DOWNLOAD_CHUNK_SIZE: 1024 * 1024, // 1MB
  MAX_CONCURRENT_DOWNLOADS: 3,
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  NOTIFICATION_CHANNELS: {
    DOWNLOADS: 'downloads',
    PAYMENTS: 'payments',
    CONTENT: 'content',
  },
} as const;

// Video Quality Options
export const VIDEO_QUALITIES = [
  { label: '480p', value: '480p', bitrate: 800 },
  { label: '720p', value: '720p', bitrate: 1500 },
  { label: '1080p', value: '1080p', bitrate: 3000 },
] as const;

// Subscription Plans
export const SUBSCRIPTION_FEATURES = {
  FREE: ['Limited episodes', 'Basic quality'],
  PREMIUM: ['All episodes', 'HD quality', 'Download offline', 'No ads'],
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: '@pitara/user_preferences',
  DOWNLOAD_QUEUE: '@pitara/download_queue',
  AUTH_TOKEN: '@pitara/auth_token',
  THEME_PREFERENCE: '@pitara/theme',
  VIDEO_QUALITY: '@pitara/video_quality',
} as const; 