import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'update' | 'promotional';
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [newNotification, setNewNotification] = useState<NotificationData | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      return permission === 'granted';
    }
    return false;
  };

  // Show browser notification
  const showBrowserNotification = (notification: NotificationData) => {
    if (permission === 'granted' && 'Notification' in window) {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico', // You can customize this
        badge: '/favicon.ico',
        tag: notification.id,
        data: {
          id: notification.id,
          type: notification.type,
        },
      });

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        // Handle notification click - you can navigate to specific screens here
        console.log('Notification clicked:', notification);
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  };

  // Save device token (for web, we'll use a simple identifier)
  const saveDeviceToken = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user, skipping token save');
        return;
      }

      // For web, we'll create a simple device identifier
      const deviceId = localStorage.getItem('device_id') || 
        `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!localStorage.getItem('device_id')) {
        localStorage.setItem('device_id', deviceId);
      }

      const { error } = await supabase
        .from('device_tokens')
        .upsert({
          user_id: user.id,
          token: deviceId,
          platform: 'web',
        }, {
          onConflict: 'user_id,token'
        });

      if (error) {
        console.error('Error saving device token:', error);
      } else {
        console.log('Device token saved successfully');
      }
    } catch (error) {
      console.error('Error in saveDeviceToken:', error);
    }
  };

  // Fetch existing notifications
  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    }
  };

  // Dismiss new notification
  const dismissNewNotification = () => {
    setNewNotification(null);
  };

  useEffect(() => {
    // Check current notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Request permission if not already granted
    if (permission === 'default') {
      requestNotificationPermission();
    }

    // Save device token
    saveDeviceToken();

    // Fetch existing notifications
    fetchNotifications();

    // Listen for new notifications from Supabase realtime
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          console.log('New notification received:', payload);
          const newNotif = payload.new as NotificationData;
          setNotifications(prev => [newNotif, ...prev]);
          setNewNotification(newNotif);
          
          // Show browser notification
          showBrowserNotification(newNotif);
          
          // Clear new notification alert after 5 seconds
          setTimeout(() => setNewNotification(null), 5000);
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [permission]);

  return {
    notifications,
    newNotification,
    permission,
    requestNotificationPermission,
    refreshNotifications: fetchNotifications,
    dismissNewNotification,
  };
}; 