import { Linking, Alert, NativeModules, Platform } from 'react-native';
import { useBreatheSettingsStore } from '../store/breatheSettingsStore';
import { AppInfo, TimeWindow } from '../types/breatheSettings';

// Lazy-load AppInterceptor to avoid load-order issues (module loaded on first use)
let _appInterceptorModule: { getAppInterceptorModule: () => any } | null | undefined = undefined;

function getAppInterceptorModule(): (() => any) | null {
  if (_appInterceptorModule === undefined) {
    try {
      const mod = require('../native-modules/AppInterceptor');
      _appInterceptorModule = mod && typeof mod.getAppInterceptorModule === 'function' ? mod : null;
    } catch (_) {
      _appInterceptorModule = null;
    }
  }
  return _appInterceptorModule?.getAppInterceptorModule ?? null;
}

/** Resolve the native module whether the package exports a getter or the module directly. */
function resolveNativeModule(): any {
  const modOrGetter = getAppInterceptorModule();
  if (!modOrGetter) return null;
  if (typeof modOrGetter === 'function') return modOrGetter();
  // Package may export the module object directly
  if (typeof modOrGetter.getInstalledApps === 'function' || typeof modOrGetter.hasPermissions === 'function') return modOrGetter;
  return null;
}

/** On Android, fallback to NativeModules.BreatheInAccessibility when the JS wrapper failed to load. */
function getAndroidDirectModule(): any {
  if (Platform.OS !== 'android') return null;
  const mod = NativeModules.BreatheInAccessibility ?? null;
  if (!mod || typeof mod.getInstalledApps !== 'function') return null;
  return {
    initialize: async () => {},
    startMonitoring: async () => {},
    stopMonitoring: async () => { if (typeof mod.setMonitoredPackages === 'function') mod.setMonitoredPackages([]); },
    onAppLaunch: () => {},
    getInstalledApps: async (): Promise<AppInfo[]> => {
      const list = await mod.getInstalledApps();
      if (!Array.isArray(list)) return [];
      return list.map((item: { id: string; name: string; category?: string }) => ({
        id: item.id,
        name: item.name,
        category: item.category ?? 'other',
      }));
    },
    hasPermissions: () => (typeof mod.hasPermissions === 'function' ? mod.hasPermissions() : Promise.resolve(false)),
    hasAccessibilityPermission: () => (typeof mod.hasAccessibilityPermission === 'function' ? mod.hasAccessibilityPermission() : Promise.resolve(false)),
    hasOverlayPermission: () => (typeof mod.hasOverlayPermission === 'function' ? mod.hasOverlayPermission() : Promise.resolve(false)),
    requestPermissions: () => (typeof mod.requestPermissions === 'function' ? mod.requestPermissions() : Promise.resolve(false)),
    requestOverlayPermission: () => (typeof mod.requestOverlayPermission === 'function' ? mod.requestOverlayPermission() : Promise.resolve(false)),
    setMonitoredPackages: (ids: string[]) => { if (typeof mod.setMonitoredPackages === 'function') mod.setMonitoredPackages(ids); },
    launchApp: async (packageId: string): Promise<boolean> => {
      if (typeof mod.launchApp !== 'function') return false;
      await mod.launchApp(packageId);
      return true;
    },
    dismissOverlay: async (): Promise<boolean> => {
      if (typeof mod.dismissOverlay !== 'function') return false;
      await mod.dismissOverlay();
      return true;
    },
  };
}

/** Prefer wrapper; on Android use direct native module when wrapper is null. */
function getEffectiveModule(): any {
  const wrapped = resolveNativeModule();
  if (wrapped) return wrapped;
  return getAndroidDirectModule();
}

let _appListDiagnosticLogged = false;
function logAppListDiagnostic(reason: 'unavailable' | 'empty', resolved: any): void {
  if (_appListDiagnosticLogged) return;
  _appListDiagnosticLogged = true;
  const getter = getAppInterceptorModule();
  const hasGetter = getter != null;
  const getterIsFn = typeof getter === 'function';
  const resolvedOk = resolved != null && typeof resolved?.getInstalledApps === 'function';
  const androidMod = Platform.OS === 'android' ? NativeModules.BreatheInAccessibility : undefined;
  const hasAndroidMod = androidMod != null;
  console.warn(
    '[Breathe In] App list diagnostic: reason=' +
      reason +
      ' getter=' +
      (hasGetter ? (getterIsFn ? 'function' : 'object') : 'null') +
      ' resolved=' +
      (resolvedOk ? 'ok' : 'null') +
      (Platform.OS === 'android' ? ' NativeModules.BreatheInAccessibility=' + (hasAndroidMod ? 'yes' : 'no') : '')
  );
}

class AppInterceptionService {
  private isInitialized = false;
  private isMonitoring = false;
  private appLaunchCallback: ((appId: string) => void) | null = null;
  private currentOverlayApp: AppInfo | null = null;
  private overlayVisible = false;
  /** True when we've just launched another app; prevents navigation from bringing Breathe In back to foreground */
  private launchedAnotherApp = false;

  /**
   * Initialize the app interception service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const nativeModule = getEffectiveModule();
      if (nativeModule) {
        if (typeof nativeModule.initialize === 'function') await nativeModule.initialize();
      } else {
        if (__DEV__) console.warn('[Breathe In] Native AppInterceptor module not available');
      }
      this.isInitialized = true;
      console.log('App interception service initialized');
    } catch (error) {
      console.error('Error initializing app interception service:', error);
      // Don't throw - allow service to continue without native module
      this.isInitialized = true;
    }
  }

  /**
   * Start monitoring app launches
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    const settings = useBreatheSettingsStore.getState();
    if (!settings.isEnabled) {
      console.log('App interception is disabled');
      return;
    }

    try {
      const nativeModule = getEffectiveModule();
      if (nativeModule) {
        const hasPermissions = await nativeModule.hasPermissions();
        if (!hasPermissions) {
          throw new Error('Permissions not granted. Please grant necessary permissions first.');
        }

        // Sync monitored package IDs to native (Android Accessibility Service reads these)
        if (typeof nativeModule.setMonitoredPackages === 'function') {
          const packageIds = this.getMonitoredPackageIds(settings);
          nativeModule.setMonitoredPackages(packageIds);
        }
        
        await nativeModule.startMonitoring();
        nativeModule.onAppLaunch((appId: string) => {
          this.handleAppLaunch(appId);
        });
      } else {
        console.warn('Native AppInterceptor module not available - monitoring will not work');
        throw new Error('Native module not available');
      }

      this.isMonitoring = true;
      console.log('App interception monitoring started');
    } catch (error) {
      console.error('Error starting app interception monitoring:', error);
      throw error;
    }
  }

  /**
   * Sync monitored package IDs to native (call after selectedApps/breatheLists change while monitoring is on)
   */
  syncMonitoredPackages(): void {
    try {
      const nativeModule = getEffectiveModule();
      if (nativeModule && typeof nativeModule.setMonitoredPackages === 'function') {
        const settings = useBreatheSettingsStore.getState();
        const packageIds = this.getMonitoredPackageIds(settings);
        nativeModule.setMonitoredPackages(packageIds);
      }
    } catch (error) {
      console.warn('Error syncing monitored packages:', error);
    }
  }

  /**
   * Stop monitoring app launches
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    try {
      const nativeModule = getEffectiveModule();
      if (nativeModule) {
        await nativeModule.stopMonitoring();
      }
      this.isMonitoring = false;
      console.log('App interception monitoring stopped');
    } catch (error) {
      console.error('Error stopping app interception monitoring:', error);
      // Still set monitoring to false even if there's an error
      this.isMonitoring = false;
    }
  }

  /**
   * Handle app launch event
   */
  private async handleAppLaunch(appId: string): Promise<void> {
    const settings = useBreatheSettingsStore.getState();

    // Check if feature is enabled
    if (!settings.isEnabled) {
      return;
    }

    // Check if app is in selected apps or any breathe list
    const shouldIntercept = this.shouldInterceptApp(appId, settings);
    if (!shouldIntercept) {
      return;
    }

    // Check if current time is within active time window
    if (!this.isWithinTimeWindow(settings.timeWindows)) {
      return;
    }

    // Find app info
    const appInfo = this.findAppInfo(appId, settings);
    if (!appInfo) {
      console.warn(`App info not found for: ${appId}`);
      return;
    }

    // Show breathing overlay
    this.showOverlay(appInfo);
  }

  /**
   * Get list of package IDs to monitor (from selectedApps + breatheLists)
   */
  private getMonitoredPackageIds(settings: any): string[] {
    const ids = new Set<string>();
    for (const app of settings.selectedApps || []) {
      if (app?.id) ids.add(app.id);
    }
    for (const list of settings.breatheLists || []) {
      for (const app of list?.apps || []) {
        if (app?.id) ids.add(app.id);
      }
    }
    return Array.from(ids);
  }

  /**
   * Check if app should be intercepted
   */
  private shouldInterceptApp(appId: string, settings: any): boolean {
    // Check if app is in selected apps
    const inSelectedApps = settings.selectedApps.some(
      (app: AppInfo) => app.id === appId
    );

    if (inSelectedApps) {
      return true;
    }

    // Check if app is in any breathe list
    const inBreatheList = settings.breatheLists.some((list: any) =>
      list.apps.some((app: AppInfo) => app.id === appId)
    );

    return inBreatheList;
  }

  /**
   * Check if current time is within any active time window
   */
  private isWithinTimeWindow(timeWindows: TimeWindow[]): boolean {
    // If no time windows, always active
    if (timeWindows.length === 0) {
      return true;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Check if current time is within any window
    return timeWindows.some(
      (window) => currentTime >= window.start && currentTime <= window.end
    );
  }

  /**
   * Find app info by ID
   */
  private findAppInfo(appId: string, settings: any): AppInfo | null {
    // Check selected apps
    let app = settings.selectedApps.find((a: AppInfo) => a.id === appId);
    if (app) {
      return app;
    }

    // Check breathe lists
    for (const list of settings.breatheLists) {
      app = list.apps.find((a: AppInfo) => a.id === appId);
      if (app) {
        return app;
      }
    }

    // Return a default app info if not found
    return {
      id: appId,
      name: appId.split('.').pop() || 'Unknown App',
    };
  }

  /**
   * Show breathing overlay
   */
  private showOverlay(appInfo: AppInfo): void {
    if (this.overlayVisible) {
      return; // Already showing overlay
    }

    this.currentOverlayApp = appInfo;
    this.overlayVisible = true;

    // Emit event that overlay should be shown
    // The root layout will listen to this and show the overlay
    // For now, we'll use a simple callback system
    if (this.onShowOverlayCallback) {
      this.onShowOverlayCallback(appInfo);
    }
  }

  /**
   * Hide breathing overlay
   */
  hideOverlay(): void {
    this.overlayVisible = false;
    this.currentOverlayApp = null;

    if (this.onHideOverlayCallback) {
      this.onHideOverlayCallback();
    }
  }

  /**
   * Handle overlay completion
   */
  async handleOverlayComplete(): Promise<void> {
    if (this.currentOverlayApp) {
      // Increment statistics
      await useBreatheSettingsStore
        .getState()
        .incrementBreathedCount(this.currentOverlayApp.id);
    }

    this.hideOverlay();
  }

  /**
   * Get installed apps (for app selection)
   */
  async getInstalledApps(): Promise<AppInfo[]> {
    try {
      const nativeModule = getEffectiveModule();
      if (nativeModule && typeof nativeModule.getInstalledApps === 'function') {
        const list = await nativeModule.getInstalledApps();
        if (Array.isArray(list) && list.length > 0) return list;
        // Native module present but returned empty (e.g. bridge not ready yet)
        if (__DEV__) {
          logAppListDiagnostic('empty', nativeModule);
          console.debug(
            '[Breathe In] Native app list returned empty; using sample list. ' +
            'If you built with npx expo run:android, try reopening the app or the choose-apps screen.'
          );
        }
      } else if (__DEV__) {
        logAppListDiagnostic('unavailable', null);
        let inExpoGo = false;
        try {
          const Constants = require('expo-constants').default;
          inExpoGo = Constants.appOwnership === 'expo';
        } catch (_) {}
        if (inExpoGo) {
          console.warn(
            '[Breathe In] You are in Expo Go. The real app list only works in a development build. ' +
            'Run: npx expo run:android (then use the "Breathe In" app that opens, not Expo Go).'
          );
        } else {
          console.debug(
            '[Breathe In] Native app list not available; using sample list. ' +
            'Run "npx expo run:android" and open that app (not Expo Go) for the real list.'
          );
        }
      }
      return [
        { id: 'com.twitter', name: 'X (Twitter)', category: 'social' },
        { id: 'com.reddit', name: 'Reddit', category: 'social' },
        { id: 'com.instagram', name: 'Instagram', category: 'social' },
        { id: 'com.facebook', name: 'Facebook', category: 'social' },
        { id: 'com.linkedin', name: 'LinkedIn', category: 'social' },
        { id: 'com.discord', name: 'Discord', category: 'social' },
        { id: 'com.tiktok', name: 'TikTok', category: 'entertainment' },
        { id: 'com.youtube', name: 'YouTube', category: 'entertainment' },
        { id: 'com.netflix', name: 'Netflix', category: 'entertainment' },
        { id: 'com.spotify', name: 'Spotify', category: 'entertainment' },
        { id: 'com.amazon', name: 'Amazon', category: 'shopping' },
        { id: 'com.uber', name: 'Uber', category: 'shopping' },
        { id: 'com.doordash', name: 'DoorDash', category: 'shopping' },
      ];
    } catch (error) {
      console.error('Error getting installed apps:', error);
      return [];
    }
  }

  /**
   * Check if permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const nativeModule = getEffectiveModule();
      if (nativeModule) {
        return await nativeModule.hasPermissions();
      }
      return false;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Request necessary permissions (opens Accessibility settings on Android).
   * If native intent fails, opens app Settings as fallback and shows instructions.
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const nativeModule = getEffectiveModule();
        if (nativeModule && typeof nativeModule.requestPermissions === 'function') {
          await nativeModule.requestPermissions();
          return true;
        }
      } catch (error) {
        console.warn('Could not open Accessibility settings via native module:', error);
      }
      // Fallback: open app Settings so user can navigate to Accessibility
      Linking.openSettings();
      Alert.alert(
        'Open Accessibility',
        'Go to Settings, then tap Accessibility. Find "Breathe In" in the list and turn it On.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return false;
  }

  /**
   * Check if accessibility permission is granted (Android)
   */
  async hasAccessibilityPermission(): Promise<boolean> {
    const mod = getEffectiveModule();
    if (mod && typeof mod.hasAccessibilityPermission === 'function') {
      return await mod.hasAccessibilityPermission();
    }
    return false;
  }

  /**
   * Check if overlay permission (SYSTEM_ALERT_WINDOW) is granted (Android)
   */
  async hasOverlayPermission(): Promise<boolean> {
    const mod = getEffectiveModule();
    if (mod && typeof mod.hasOverlayPermission === 'function') {
      return await mod.hasOverlayPermission();
    }
    return false;
  }

  /**
   * Request overlay permission (Display over other apps) on Android
   */
  async requestOverlayPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const nativeModule = getEffectiveModule();
        if (nativeModule && typeof nativeModule.requestOverlayPermission === 'function') {
          await nativeModule.requestOverlayPermission();
          return true;
        }
      } catch (error) {
        console.warn('Could not open overlay permission settings:', error);
      }
    }
    return false;
  }

  // Callbacks for overlay management
  private onShowOverlayCallback: ((appInfo: AppInfo) => void) | null = null;
  private onHideOverlayCallback: (() => void) | null = null;

  /**
   * Set callback for when overlay should be shown
   */
  setOnShowOverlay(callback: (appInfo: AppInfo) => void): void {
    this.onShowOverlayCallback = callback;
  }

  /**
   * Set callback for when overlay should be hidden
   */
  setOnHideOverlay(callback: () => void): void {
    this.onHideOverlayCallback = callback;
  }

  /**
   * Get current overlay state
   */
  getOverlayState(): { visible: boolean; appInfo: AppInfo | null } {
    return {
      visible: this.overlayVisible,
      appInfo: this.currentOverlayApp,
    };
  }

  /**
   * Launch app by package id (Android). Used when user dismisses overlay so they go to the app they were opening.
   */
  async launchAppToForeground(packageId: string): Promise<boolean> {
    const mod = getEffectiveModule();
    if (mod && typeof mod.launchApp === 'function') {
      try {
        const ok = await mod.launchApp(packageId);
        if (__DEV__) console.warn('[Breathe In] launchAppToForeground native:', ok ? 'ok' : 'false');
        if (ok) {
          this.launchedAnotherApp = true;
          return true;
        }
      } catch (e) {
        if (__DEV__) console.warn('[Breathe In] launchAppToForeground native error:', e);
      }
    }
    // Fallback: try Android intent URL so the other app opens (e.g. if native module not rebuilt)
    if (Platform.OS === 'android') {
      try {
        const intentUrl = `intent:#Intent;package=${packageId};action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end`;
        await Linking.openURL(intentUrl);
        if (__DEV__) console.warn('[Breathe In] launchAppToForeground intent fallback: opened');
        this.launchedAnotherApp = true;
        return true;
      } catch (e) {
        if (__DEV__) console.warn('[Breathe In] launchAppToForeground intent fallback error:', e);
      }
    }
    if (__DEV__) console.warn('[Breathe In] launchAppToForeground failed for package:', packageId);
    return false;
  }

  /**
   * Check if we just launched another app (to prevent navigation from bringing Breathe In back).
   * Clears the flag after checking so subsequent checks return false.
   */
  didLaunchAnotherApp(): boolean {
    const val = this.launchedAnotherApp;
    this.launchedAnotherApp = false;
    return val;
  }
}

// Export singleton instance
export const appInterceptionService = new AppInterceptionService();
