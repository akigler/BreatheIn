import * as Notifications from 'expo-notifications';
import { updateUserStatus } from './authService';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Initialize notification listeners
 */
export const initializeNotifications = (): void => {
  // Handle notification received while app is in foreground
  Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    // You can show a custom in-app notification here
  });

  // Handle notification tapped (app opened from notification)
  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    
    // Deep link to breathing session if it's a nudge
    // Note: Router navigation should be handled in the component that uses this service
    if (data?.type === 'nudge') {
      const duration = data.duration || 5;
      updateUserStatus('breathing');
      // Navigation will be handled by the app's deep linking configuration
      // or by importing router in the component that uses this
    }
  });
};

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

/**
 * Get Expo push token
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    });
    return token.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
};

/**
 * Schedule a local notification (for testing)
 */
export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: any
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: { seconds: 2 },
  });
};
