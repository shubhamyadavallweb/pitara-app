import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

const queryClient = new QueryClient();

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { newNotification, dismissNewNotification } = useNotifications();

  if (isLoading) {
    return <LoadingSpinner />;
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <div className="min-h-screen">
                <Toaster />
                <Sonner />
                <AppContent />
              </div>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
