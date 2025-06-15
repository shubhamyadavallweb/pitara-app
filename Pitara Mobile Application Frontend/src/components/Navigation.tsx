import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Download, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();

  // Don't show navigation on video player screen or when not authenticated
  if (!isAuthenticated || location.pathname.includes('/watch/')) {
    return null;
  }

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'search', label: 'Search', icon: Search, path: '/search' },
    { id: 'downloads', label: 'Downloads', icon: Download, path: '/downloads' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ];

  const getPageTitle = () => {
    const currentPath = location.pathname;
    if (currentPath.includes('/series/')) return 'Series';
    const currentItem = navItems.find(item => item.path === currentPath);
    return currentItem?.label || 'Pitara';
  };

  return (
    <>
      {/* Top Header */}
      <motion.header
        className="fixed top-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <motion.div
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-xl font-bold text-pitara-gold">{getPageTitle()}</h1>
          </motion.div>

          <motion.div
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {user?.avatar && (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full border-2 border-pitara-gold"
              />
            )}
          </motion.div>
        </div>
      </motion.header>

      {/* Bottom Navigation */}
      <motion.nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center justify-around px-4 py-2">
          {navItems.map((item, index) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center space-y-1 py-2 px-4 rounded-lg transition-all duration-300 ${
                  isActive ? 'text-pitara-gold' : 'text-muted-foreground'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'pitara-glow-gold' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    className="w-1 h-1 bg-pitara-gold rounded-full"
                    layoutId="activeTab"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.nav>
    </>
  );
};

export default Navigation;
