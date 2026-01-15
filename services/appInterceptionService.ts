import { useBreatheSettingsStore } from '../store/breatheSettingsStore';
import { AppInfo, TimeWindow } from '../types/breatheSettings';

// Safely import the native module functions
let getAppInterceptorModule: (() => any) | null = null;
let isNativeModuleAvailable: (() => boolean) | null = null;

try {
  const appInterceptorModule = require('../native-modules/AppInterceptor');
  getAppInterceptorModule = appInterceptorModule.getAppInterceptorModule;
  isNativeModuleAvailable = appInterceptorModule.isNativeModuleAvailable;
} catch (error) {
  console.warn('Failed to load AppInterceptor module:', error);
  // Provide fallback functions
  getAppInterceptorModule = () => null;
  isNativeModuleAvailable = () => false;
}

class AppInterceptionService {
  private isInitialized = false;
  private isMonitoring = false;
  private appLaunchCallback: ((appId: string) => void) | null = null;
  private currentOverlayApp: AppInfo | null = null;
  private overlayVisible = false;

  /**
   * Initialize the app interception service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      if (!getAppInterceptorModule) {
        console.warn('getAppInterceptorModule function not available');
        this.isInitialized = true;
        return;
      }

      const nativeModule = getAppInterceptorModule();
      if (nativeModule) {
        await nativeModule.initialize();
      } else {
        console.warn('Native AppInterceptor module not available');
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
      if (!getAppInterceptorModule) {
        console.warn('getAppInterceptorModule function not available');
        return;
      }

      const nativeModule = getAppInterceptorModule();
      
      // Check permissions before starting
      if (nativeModule) {
        const hasPermissions = await nativeModule.hasPermissions();
        if (!hasPermissions) {
          throw new Error('Permissions not granted. Please grant necessary permissions first.');
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
   * Stop monitoring app launches
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    try {
      if (getAppInterceptorModule) {
        const nativeModule = getAppInterceptorModule();
        if (nativeModule) {
          await nativeModule.stopMonitoring();
        }
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
      if (getAppInterceptorModule) {
        const nativeModule = getAppInterceptorModule();
        if (nativeModule) {
          return await nativeModule.getInstalledApps();
        }
      }
      // Return mock apps for now if native module not available
      console.warn('Native module not available, returning mock apps');
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
      if (!getAppInterceptorModule) {
        return false;
      }
      const nativeModule = getAppInterceptorModule();
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
   * Request necessary permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!getAppInterceptorModule) {
        return false;
      }
      const nativeModule = getAppInterceptorModule();
      if (nativeModule) {
        return await nativeModule.requestPermissions();
      }
      return false;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
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
}

// Export singleton instance
export const appInterceptionService = new AppInterceptionService();
