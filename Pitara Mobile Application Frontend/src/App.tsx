import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SearchScreen from './screens/SearchScreen';
import DownloadsScreen from './screens/DownloadsScreen';
import UpcomingScreen from './screens/UpcomingScreen';
import ProfileScreen from './screens/ProfileScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import SeriesDetailScreen from './screens/SeriesDetailScreen';
import VideoPlayerScreen from './screens/VideoPlayerScreen';
import SubscriptionHistoryScreen from './screens/SubscriptionHistoryScreen';
import Navigation from './components/Navigation';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './styles/globals.css';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationBanner } from '@/components/NotificationBanner';
import LoadingSpinner from './components/LoadingSpinner';
import DebugScreen from './components/DebugScreen';
import { isNative } from '@/lib/platform';

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { newNotification, dismissNewNotification } = useNotifications();

  // Add extensive logging to understand what's happening
  React.useEffect(() => {
    console.log('=== APP STATE UPDATE ===');
    console.log('isLoading:', isLoading);
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user:', user);
    console.log('current path:', window.location.pathname);
  }, [isLoading, isAuthenticated, user]);

  // Add a timeout to prevent infinite loading - if loading for more than 5 seconds, show debug or login
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);
  
  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.log('Loading timeout reached after 5 seconds');
        setLoadingTimeout(true);
      }, 5000); // 5 second timeout instead of 10
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  // Force show debug screen after timeout or if there's an issue
  if (loadingTimeout) {
    console.log('Showing debug screen due to timeout');
    return <DebugScreen />;
  }

  if (isLoading) {
    console.log('Showing loading spinner');
    return (
      <div className="min-h-screen bg-pitara-dark flex items-center justify-center">
        <LoadingSpinner text="Loading Pitara..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <NotificationBanner
        notification={newNotification}
        onDismiss={dismissNewNotification}
        onTap={(notification) => {
          console.log('Notification tapped:', notification);
          // Handle notification tap - navigate to relevant screen
        }}
      />
      <Routes>
        {isAuthenticated ? (
          <>
            {/* Core app routes (requires auth) */}
            <Route path="/" element={<HomeScreen />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/series/:seriesId" element={<SeriesDetailScreen />} />
            <Route path="/watch/:seriesId/:episodeId" element={<VideoPlayerScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/subscription" element={<SubscriptionScreen />} />
            <Route path="/subscription-history" element={<SubscriptionHistoryScreen />} />
            <Route path="/downloads" element={<DownloadsScreen />} />
            {/* Redirect to home if authenticated but on login page */}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<LoginScreen />} />
            {/* Redirect everything else to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
      </Routes>
      <Toaster />
    </div>
  );
};

const App = () => {
  // Choose appropriate router based on platform
  const RouterComponent = isNative() ? HashRouter : BrowserRouter;
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <RouterComponent>
              <div className="min-h-screen">
                <Toaster />
                <Sonner />
                <AppContent />
              </div>
            </RouterComponent>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
