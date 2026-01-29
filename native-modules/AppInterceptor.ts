import { Platform } from 'react-native';
import type { AppInterceptorModule } from './AppInterceptor.types';

export type { AppInterceptorModule } from './AppInterceptor.types';

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
