import { AppInfo } from '../types/breatheSettings';

/**
 * Native module interface for app interception.
 * Kept in a separate file so platform implementations (android/ios) can import
 * it without creating a circular dependency with AppInterceptor.ts.
 */
export interface AppInterceptorModule {
  initialize: () => Promise<void>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  onAppLaunch: (callback: (appId: string) => void) => void;
  getInstalledApps: () => Promise<AppInfo[]>;
  /** Check if all required permissions are granted (accessibility + overlay on Android) */
  hasPermissions: () => Promise<boolean>;
  /** Check if accessibility permission is granted (Android) */
  hasAccessibilityPermission?: () => Promise<boolean>;
  /** Check if overlay permission (SYSTEM_ALERT_WINDOW) is granted (Android) */
  hasOverlayPermission?: () => Promise<boolean>;
  /** Open accessibility settings */
  requestPermissions: () => Promise<boolean>;
  /** Open overlay permission settings (Display over other apps) (Android) */
  requestOverlayPermission?: () => Promise<boolean>;
  setMonitoredPackages?: (packageIds: string[]) => void;
  /** Android: launch app by package id */
  launchApp?: (packageId: string) => Promise<boolean>;
  /** Android: dismiss the native overlay if showing */
  dismissOverlay?: () => Promise<boolean>;
}
