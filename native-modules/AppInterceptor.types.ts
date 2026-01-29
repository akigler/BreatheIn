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
  hasPermissions: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  setMonitoredPackages?: (packageIds: string[]) => void;
  /** Android: launch app by package id so user goes to that app after overlay dismiss */
  launchApp?: (packageId: string) => Promise<boolean>;
}
