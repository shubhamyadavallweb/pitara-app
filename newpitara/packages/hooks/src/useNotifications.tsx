import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@pitara/supabase';

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface NotificationData {
  title: string;
  body: string;
  data?: any;
}

interface UseNotificationsReturn {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: string | null;
  isRegistered: boolean;
  sendLocalNotification: (notification: NotificationData) => Promise<void>;
  scheduleNotification: (notification: NotificationData, trigger: Notifications.NotificationTriggerInput) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
}

export function useNotifications(): UseNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listen for notification interactions
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Handle notification tap - navigate to specific screens based on data
      if (data?.screen) {
        // This would integrate with your navigation
        console.log('Navigate to:', data.screen, data);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('downloads', {
          name: 'Downloads',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('payments', {
          name: 'Payments',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });

        await Notifications.setNotificationChannelAsync('content', {
          name: 'New Content',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });
      }

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          setError('Push notification permissions not granted');
          return false;
        }
        
        return true;
      } else {
        setError('Must use physical device for Push Notifications');
        return false;
      }
    } catch (error) {
      setError(`Error requesting permissions: ${error}`);
      return false;
    }
  };

  const registerForPushNotificationsAsync = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Get the token that uniquely identifies this device
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      setExpoPushToken(token.data);
      await AsyncStorage.setItem('@pitara/push_token', token.data);

      // Register device token with Supabase
      await registerDeviceToken(token.data);
      setIsRegistered(true);
    } catch (error) {
      setError(`Error registering for push notifications: ${error}`);
    }
  };

  const registerDeviceToken = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if token already exists
      const { data: existingToken } = await supabase
        .from('device_tokens')
        .select('id')
        .eq('token', token)
        .eq('user_id', user.id)
        .single();

      if (!existingToken) {
        // Insert new device token
        await supabase
          .from('device_tokens')
          .insert({
            user_id: user.id,
            token: token,
            platform: Platform.OS,
            device_id: Constants.deviceId || `${Platform.OS}-${Date.now()}`,
            created_at: new Date().toISOString(),
          });
      } else {
        // Update last seen
        await supabase
          .from('device_tokens')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existingToken.id);
      }
    } catch (error) {
      console.error('Error registering device token:', error);
    }
  };

  const sendLocalNotification = async (notificationData: NotificationData) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
        },
        trigger: null,
      });
    } catch (error) {
      setError(`Error sending local notification: ${error}`);
    }
  };

  const scheduleNotification = async (
    notificationData: NotificationData,
    trigger: Notifications.NotificationTriggerInput
  ) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
        },
        trigger,
      });
    } catch (error) {
      setError(`Error scheduling notification: ${error}`);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      setError(`Error clearing notifications: ${error}`);
    }
  };

  return {
    expoPushToken,
    notification,
    error,
    isRegistered,
    sendLocalNotification,
    scheduleNotification,
    clearAllNotifications,
    requestPermissions,
  };
} 