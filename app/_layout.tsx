import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import '../services/firebaseConfig'; // Initialize Firebase
import { initializeAuth } from '../services/authService';
import { initializeNotifications, requestNotificationPermissions } from '../services/notificationService';
import { appInterceptionService } from '../services/appInterceptionService';
import { useBreatheSettingsStore } from '../store/breatheSettingsStore';
import { BreathingOverlay } from '../components/BreathingOverlay';
import { AppInfo } from '../types/breatheSettings';

export default function RootLayout() {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayApp, setOverlayApp] = useState<AppInfo | null>(null);
  const { isEnabled, defaultBreathingDuration } = useBreatheSettingsStore();

  useEffect(() => {
    // Initialize app-wide services
    const initApp = async () => {
      try {
        // Request notification permissions
        await requestNotificationPermissions();
        
        // Initialize notifications
        initializeNotifications();
        
        // Initialize authentication
        await initializeAuth();

        // Initialize app interception service
        await appInterceptionService.initialize();

        // Set up overlay callbacks
        appInterceptionService.setOnShowOverlay((appInfo: AppInfo) => {
          setOverlayApp(appInfo);
          setOverlayVisible(true);
        });

        appInterceptionService.setOnHideOverlay(() => {
          setOverlayVisible(false);
          setOverlayApp(null);
        });
      } catch (error: any) {
        console.error('Error initializing app:', error);
        
        // Show user-friendly error for Firebase configuration issues
        if (error?.name === 'FirebaseConfigurationError' || error?.code === 'auth/configuration-not-found') {
          console.error(
            '\n⚠️  FIREBASE SETUP REQUIRED:\n' +
            'Please enable Anonymous Authentication in Firebase Console:\n' +
            '1. Go to https://console.firebase.google.com/\n' +
            '2. Select your project (breathein-e1423)\n' +
            '3. Go to Authentication → Sign-in method\n' +
            '4. Enable "Anonymous" authentication\n\n' +
            'Original error:', error.message
          );
        }
      }
    };

    initApp();
  }, []);

  // Start/stop monitoring based on settings
  useEffect(() => {
    const toggleMonitoring = async () => {
      if (isEnabled) {
        await appInterceptionService.startMonitoring();
      } else {
        await appInterceptionService.stopMonitoring();
      }
    };

    toggleMonitoring();
  }, [isEnabled]);

  const handleOverlayComplete = async () => {
    await appInterceptionService.handleOverlayComplete();
  };

  const handleOverlaySkip = () => {
    appInterceptionService.hideOverlay();
  };

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#000' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding-breathing" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session/[id]" />
        <Stack.Screen name="invite-friends" />
        <Stack.Screen name="breathe-settings" />
        <Stack.Screen name="breathe-list/[id]" />
      </Stack>

      {/* Global Breathing Overlay */}
      <BreathingOverlay
        visible={overlayVisible}
        appInfo={overlayApp}
        duration={defaultBreathingDuration}
        onComplete={handleOverlayComplete}
        onSkip={handleOverlaySkip}
      />
    </>
  );
}
