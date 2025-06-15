import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Settings, Moon, Sun, Download, LogOut, Camera, ArrowLeft, CreditCard, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { useDownloads } from '../hooks/useDownloads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const ProfileScreen = () => {
  const { user, signOut, updateProfile } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { subscription, isSubscribed, subscriptionTier } = useSubscription();
  const { downloads } = useDownloads();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [userName, setUserName] = useState(user?.name || 'User');
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [downloadQuality, setDownloadQuality] = useState('1080p');

  const handleSaveProfile = async () => {
    try {
      await updateProfile({ name: userName, email: userEmail });
      setIsEditingProfile(false);
      
      localStorage.setItem('pitara_download_quality', downloadQuality);
      
      toast({
        title: "Profile Updated",
        description: "Your profile settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      updateProfile({ avatar: imageUrl });
      
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const qualityOptions = ['360p', '480p', '720p', '1080p', '4K'];

  const settingsOptions = [
    {
      id: 'account',
      title: 'Account Settings',
      description: 'Manage your account details',
      icon: User,
      action: () => setIsEditingProfile(true)
    },
    {
      id: 'subscription',
      title: 'Subscription',
      description: isSubscribed ? `${subscriptionTier} Plan` : 'No active subscription',
      icon: CreditCard,
      action: () => navigate('/subscription')
    },
    {
      id: 'history',
      title: 'Purchase History',
      description: 'View your past transactions',
      icon: History,
      action: () => navigate('/subscription-history')
    },
    {
      id: 'theme',
      title: 'App Theme',
      description: isDarkMode ? 'Dark mode (Current)' : 'Light mode (Current)',
      icon: isDarkMode ? Moon : Sun,
      action: () => {
        toggleTheme();
        toast({
          title: "Theme Changed",
          description: `Switched to ${!isDarkMode ? 'dark' : 'light'} mode.`,
        });
      }
    },
    {
      id: 'downloads',
      title: 'Download Quality',
      description: `${downloadQuality} (Current)`,
      icon: Download,
      action: () => {
        const currentIndex = qualityOptions.indexOf(downloadQuality);
        const nextIndex = (currentIndex + 1) % qualityOptions.length;
        const newQuality = qualityOptions[nextIndex];
        setDownloadQuality(newQuality);
        localStorage.setItem('pitara_download_quality', newQuality);
        
        toast({
          title: "Download Quality Updated",
          description: `Download quality set to ${newQuality}.`,
        });
      }
    },
    {
      id: 'logout',
      title: 'Sign Out',
      description: 'Sign out of your account',
      icon: LogOut,
      action: handleLogout,
      danger: true
    }
  ];

  React.useEffect(() => {
    const savedQuality = localStorage.getItem('pitara_download_quality');
    if (savedQuality && qualityOptions.includes(savedQuality)) {
      setDownloadQuality(savedQuality);
    }
  }, []);

  if (isEditingProfile) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-20 px-6">
        <motion.div
          className="max-w-md mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditingProfile(false)}
              className="mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Edit Profile</h1>
          </div>
          
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'}
                alt="Profile"
                className="w-24 h-24 rounded-full border-4 border-primary mx-auto"
              />
              <label className="absolute bottom-0 right-0 bg-primary rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="w-4 h-4 text-primary-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Name</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
              <Input
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full"
                placeholder="Enter your email"
                type="email"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Download Quality</label>
              <select
                value={downloadQuality}
                onChange={(e) => setDownloadQuality(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {qualityOptions.map((quality) => (
                  <option key={quality} value={quality}>{quality}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex space-x-4 mt-8">
            <Button onClick={handleSaveProfile} className="flex-1">
              Save Changes
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsEditingProfile(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-20 px-6">
      {/* Profile Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="relative inline-block mb-4"
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'}
            alt={user?.name || 'User'}
            className="w-24 h-24 rounded-full border-4 border-primary mx-auto"
          />
        </motion.div>
        
        <motion.h1
          className="text-2xl font-bold text-foreground mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {userName}
        </motion.h1>
        
        <motion.p
          className="text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {userEmail}
        </motion.p>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-3 gap-4 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <div className="bg-card rounded-xl p-4 text-center border border-border">
          <div className="text-2xl font-bold text-primary mb-1">0</div>
          <div className="text-sm text-muted-foreground">Series Watched</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border">
          <div className="text-2xl font-bold text-primary mb-1">0</div>
          <div className="text-sm text-muted-foreground">Hours Streamed</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center border border-border">
          <div className="text-2xl font-bold text-primary mb-1">{downloads.length}</div>
          <div className="text-sm text-muted-foreground">Downloads</div>
        </div>
      </motion.div>

      {/* Settings Options */}
      <motion.div
        className="space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {settingsOptions.map((option, index) => {
          const Icon = option.icon;
          
          return (
            <motion.button
              key={option.id}
              onClick={option.action}
              className={`w-full bg-card rounded-xl p-4 border transition-all duration-300 text-left hover:scale-[1.02] ${
                option.danger 
                  ? 'border-destructive/20 hover:border-destructive/50' 
                  : 'border-border hover:border-primary/50'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 + 0.5 }}
              whileHover={{ x: 5 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${
                  option.danger 
                    ? 'bg-destructive/20 text-destructive' 
                    : 'bg-primary/20 text-primary'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    option.danger ? 'text-destructive' : 'text-foreground'
                  }`}>
                    {option.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <div className={`text-muted-foreground ${option.danger ? 'hidden' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div
        className="text-center mt-12 text-muted-foreground text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1 }}
      >
        Pitara v1.0.0 - Connected to Supabase
      </motion.div>
    </div>
  );
};

export default ProfileScreen;
