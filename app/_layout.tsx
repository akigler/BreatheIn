import { Stack, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Linking, LogBox } from 'react-native';

// Suppress known non-fatal Expo error (keep-awake can fail on some devices/simulators)
LogBox.ignoreLogs(['Unable to activate keep awake']);
import '../services/firebaseConfig'; // Initialize Firebase
import { initializeAuth } from '../services/authService';
import { initializeNotifications, requestNotificationPermissions } from '../services/notificationService';
import { appInterceptionService } from '../services/appInterceptionService';
import { useBreatheSettingsStore } from '../store/breatheSettingsStore';
import { BreathingOverlay } from '../components/BreathingOverlay';
import { AppInfo } from '../types/breatheSettings';

export default function RootLayout() {
  const router = useRouter();
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayApp, setOverlayApp] = useState<AppInfo | null>(null);
  const { isEnabled, defaultBreathingDuration } = useBreatheSettingsStore();

  const urlSubRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    // Initialize app-wide services
    const initApp = async () => {
      try {
        console.log('Starting app initialization...');
        
        // Request notification permissions (non-blocking)
        try {
          await requestNotificationPermissions();
          initializeNotifications();
        } catch (error) {
          console.warn('Notification initialization failed (non-critical):', error);
        }
        
        // Initialize authentication (with error handling)
        try {
          await initializeAuth();
          console.log('Auth initialized successfully');
        } catch (error: any) {
          console.error('Auth initialization failed:', error);
          // Don't block app startup - continue without auth
          if (error?.name === 'FirebaseConfigurationError' || error?.code === 'auth/configuration-not-found') {
            console.warn(
              '⚠️  FIREBASE SETUP REQUIRED:\n' +
              'Please enable Anonymous Authentication in Firebase Console:\n' +
              '1. Go to https://console.firebase.google.com/\n' +
              '2. Select your project\n' +
              '3. Go to Authentication → Sign-in method\n' +
              '4. Enable "Anonymous" authentication'
            );
          }
        }

        // Initialize app interception service (non-blocking)
        try {
          await appInterceptionService.initialize();
          console.log('App interception service initialized');
        } catch (error) {
          console.warn('App interception initialization failed (non-critical):', error);
        }

        // Set up overlay callbacks
        appInterceptionService.setOnShowOverlay((appInfo: AppInfo) => {
          setOverlayApp(appInfo);
          setOverlayVisible(true);
        });

        appInterceptionService.setOnHideOverlay(() => {
          setOverlayVisible(false);
          setOverlayApp(null);
        });

        // Handle overlay deep link when app is opened by Accessibility Service (Android)
        const handleOverlayUrl = (url: string | null) => {
          if (!url || !url.startsWith('breathein://overlay')) return;
          try {
            const parsed = new URL(url);
            const appId = parsed.searchParams.get('app_id') || '';
            const appName = decodeURIComponent(parsed.searchParams.get('app_name') || appId.split('.').pop() || 'App');
            if (appId) {
              setOverlayApp({ id: appId, name: appName, category: 'other' });
              setOverlayVisible(true);
            }
          } catch (_) {}
        };
        Linking.getInitialURL().then(handleOverlayUrl);
        urlSubRef.current = Linking.addEventListener('url', ({ url }) => handleOverlayUrl(url));

        console.log('App initialization complete');
      } catch (error: any) {
        console.error('Critical error during app initialization:', error);
        // App should still render even if initialization fails
      }
    };
    initApp();
    return () => {
      urlSubRef.current?.remove();
    };
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
    const { appInfo } = appInterceptionService.getOverlayState();
    const packageId = appInfo?.id ?? null;
    await appInterceptionService.handleOverlayComplete();
    if (packageId) {
      await appInterceptionService.launchAppToForeground(packageId);
    }
    router.replace('/');
  };

  const handleOverlaySkip = async () => {
    const { appInfo } = appInterceptionService.getOverlayState();
    const packageId = appInfo?.id ?? null;
    appInterceptionService.hideOverlay();
    if (packageId) {
      await appInterceptionService.launchAppToForeground(packageId);
    }
    router.replace('/');
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
        <Stack.Screen name="overlay" options={{ animation: 'none' }} />
        <Stack.Screen name="onboarding-breathing" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="session/[id]" />
        <Stack.Screen name="invite-friends" />
        <Stack.Screen name="breathe-settings" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="choose-apps" />
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
