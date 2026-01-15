import { Platform, BackHandler, Alert } from 'react-native';
import * as StatusBar from 'expo-status-bar';

interface ScreenShieldModule {
  enableShield: () => Promise<void>;
  disableShield: () => Promise<void>;
}

// Check if native module is available
// For MVP, we'll use the JS fallback
const isNativeModuleAvailable = false; // Set to true when native module is implemented

// Native module interface (for future implementation)
let nativeModule: ScreenShieldModule | null = null;

// Try to require native module (will be null if not available)
if (isNativeModuleAvailable && Platform.OS === 'ios') {
  try {
    // nativeModule = require('./ScreenShieldModule').default;
    // This will be implemented later with a Swift Config Plugin
  } catch (error) {
    console.warn('Native ScreenShield module not available, using JS fallback');
  }
}

let backHandlerSubscription: any = null;
let isShieldEnabled = false;

/**
 * Enable the screen shield to prevent accidental app exits
 * Uses native module if available, otherwise falls back to JS implementation
 */
export const enableShield = async (): Promise<void> => {
  if (nativeModule) {
    // Use native module if available
    await nativeModule.enableShield();
    isShieldEnabled = true;
    return;
  }

  // JS Fallback implementation
  isShieldEnabled = true;

  // Hide status bar
  StatusBar.setStatusBarHidden(true, 'fade');

  // Intercept back button/gesture (Android)
  if (Platform.OS === 'android') {
    backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
  }

  // For iOS, we rely on the modal confirmation in the session screen
  // since iOS doesn't have a hardware back button
};

/**
 * Disable the screen shield
 */
export const disableShield = async (): Promise<void> => {
  if (nativeModule) {
    await nativeModule.disableShield();
    isShieldEnabled = false;
    return;
  }

  // JS Fallback implementation
  isShieldEnabled = false;

  // Show status bar
  StatusBar.setStatusBarHidden(false, 'fade');

  // Remove back handler
  if (backHandlerSubscription) {
    backHandlerSubscription.remove();
    backHandlerSubscription = null;
  }
};

/**
 * Handle back button press (Android)
 */
const handleBackPress = (): boolean => {
  if (!isShieldEnabled) {
    return false; // Allow default behavior
  }

  // Show confirmation modal
  Alert.alert(
    'Break Your Streak?',
    'Are you sure you want to break your streak?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => {},
      },
      {
        text: 'Yes, Stop Session',
        style: 'destructive',
        onPress: () => {
          disableShield();
          // The session screen should handle the actual session stop
        },
      },
    ],
    { cancelable: true }
  );

  return true; // Prevent default back behavior
};

/**
 * Check if shield is currently enabled
 */
export const isShieldActive = (): boolean => {
  return isShieldEnabled;
};
