import { Platform } from 'react-native';
import { AppInfo } from '../types/breatheSettings';

/**
 * Native module interface for app interception
 * 
 * This interface defines the contract for platform-specific implementations
 * that detect when apps are launched and can show overlays.
 * 
 * iOS Implementation:
 * - Uses Screen Time API (FamilyControls framework)
 * - Requires special entitlements from Apple
 * - User must grant Screen Time permissions
 * 
 * Android Implementation:
 * - Uses Accessibility Service
 * - Requires user to enable in system settings
 * - Can detect app launches and show overlays
 */

export interface AppInterceptorModule {
  /**
   * Initialize the app interceptor
   * Request necessary permissions and set up listeners
   */
  initialize: () => Promise<void>;

  /**
   * Start monitoring app launches
   */
  startMonitoring: () => Promise<void>;

  /**
   * Stop monitoring app launches
   */
  stopMonitoring: () => Promise<void>;

  /**
   * Register callback for app launch events
   * @param callback Function called when an app is launched
   */
  onAppLaunch: (callback: (appId: string) => void) => void;

  /**
   * Get list of installed apps
   * @returns Promise resolving to array of app information
   */
  getInstalledApps: () => Promise<AppInfo[]>;

  /**
   * Check if permissions are granted
   * @returns Promise resolving to true if permissions are granted
   */
  hasPermissions: () => Promise<boolean>;

  /**
   * Request necessary permissions
   * @returns Promise resolving to true if permissions were granted
   */
  requestPermissions: () => Promise<boolean>;
}

// Platform-specific implementations
let nativeModule: AppInterceptorModule | null = null;

// Try to load platform-specific implementation
try {
  if (Platform.OS === 'ios') {
    try {
      // Load the iOS implementation (currently a placeholder)
      // When native modules are implemented, this will be the actual native module
      const iOSModule = require('./AppInterceptor.ios').default;
      if (iOSModule) {
        nativeModule = iOSModule;
        console.log('Loaded iOS AppInterceptor module (placeholder)');
      }
    } catch (error) {
      console.warn('iOS AppInterceptor native module not available:', error);
      nativeModule = null;
    }
  } else if (Platform.OS === 'android') {
    try {
      // Load the Android implementation (currently a placeholder)
      // When native modules are implemented, this will be the actual native module
      const androidModule = require('./AppInterceptor.android').default;
      if (androidModule) {
        nativeModule = androidModule;
        console.log('Loaded Android AppInterceptor module (placeholder)');
      }
    } catch (error) {
      console.warn('Android AppInterceptor native module not available:', error);
      nativeModule = null;
    }
  }
} catch (error) {
  console.warn('Error loading AppInterceptor module:', error);
  nativeModule = null;
}

/**
 * Get the native module instance
 * Returns null if native module is not available (will use mock/fallback)
 */
export const getAppInterceptorModule = (): AppInterceptorModule | null => {
  return nativeModule;
};

/**
 * Check if native module is available
 */
export const isNativeModuleAvailable = (): boolean => {
  return nativeModule !== null;
};
