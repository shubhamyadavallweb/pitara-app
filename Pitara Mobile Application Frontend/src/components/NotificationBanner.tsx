import React from 'react';
import { X, AlertTriangle, Info, CheckCircle, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'update' | 'promotional';
  created_at: string;
}

interface NotificationBannerProps {
  notification: NotificationData | null;
  onDismiss: () => void;
  onTap?: (notification: NotificationData) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'alert':
      return AlertTriangle;
    case 'update':
      return CheckCircle;
    case 'promotional':
      return Megaphone;
    default:
      return Info;
  }
};

const getNotificationColors = (type: string) => {
  switch (type) {
    case 'alert':
      return {
        bg: 'bg-red-500/90',
        border: 'border-red-400',
        text: 'text-white',
        icon: '#ffffff',
      };
    case 'update':
      return {
        bg: 'bg-green-500/90',
        border: 'border-green-400',
        text: 'text-white',
        icon: '#ffffff',
      };
    case 'promotional':
      return {
        bg: 'bg-purple-500/90',
        border: 'border-purple-400',
        text: 'text-white',
        icon: '#ffffff',
      };
    default:
      return {
        bg: 'bg-blue-500/90',
        border: 'border-blue-400',
        text: 'text-white',
        icon: '#ffffff',
      };
  }
};

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  onDismiss,
  onTap,
}) => {
  if (!notification) return null;

  const colors = getNotificationColors(notification.type);
  const IconComponent = getNotificationIcon(notification.type);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        transition={{ duration: 0.3 }}
        className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto"
      >
        <div
          onClick={() => onTap?.(notification)}
          className={`${colors.bg} ${colors.border} border rounded-lg p-4 shadow-lg backdrop-blur-sm cursor-pointer hover:opacity-95 transition-opacity`}
        >
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              <IconComponent size={20} color={colors.icon} />
            </div>
            
            <div className="flex-1">
              <h3 className={`${colors.text} font-semibold text-sm mb-1`}>
                {notification.title}
              </h3>
              <p className={`${colors.text} text-xs opacity-90`}>
                {notification.message}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X size={16} color={colors.icon} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 