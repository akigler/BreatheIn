/**
 * Android App Interceptor Implementation
 *
 * Uses the BreatheInAccessibility native module (added by the config plugin) when
 * available. The Accessibility Service detects when the user opens a monitored app
 * and launches Breathe In via breathein://overlay?app_id=... so the overlay shows on top.
 *
 * We look up NativeModules at call time (lazy) so the module is found even if the
 * bridge wasn't ready at first load (e.g. with New Architecture).
 */

import { NativeModules, Platform } from 'react-native';
import type { AppInterceptorModule } from './AppInterceptor.types';
import { AppInfo } from '../types/breatheSettings';

let _loggedModuleCheck = false;

function getNativeModule(): any {
  if (Platform.OS !== 'android') return null;
  const mod = NativeModules.BreatheInAccessibility ?? null;
  // One-time diagnostic if module missing (helps debug Expo Go vs dev build, or registration issues)
  if (__DEV__ && !mod && !_loggedModuleCheck) {
    _loggedModuleCheck = true;
    const keys = Object.keys(NativeModules).filter((k) => k.toLowerCase().includes('breathe') || k.toLowerCase().includes('accessibility'));
    console.warn(
      '[BreatheIn] Native module BreatheInAccessibility not found. ' +
      'Make sure you opened the app via "npx expo run:android" (not Expo Go). ' +
      (keys.length > 0 ? `Related NativeModules: ${keys.join(', ')}` : 'No Breathe/Accessibility modules in NativeModules.')
    );
  }
  return mod;
}

export const AppInterceptorAndroid: AppInterceptorModule = {
  initialize: async () => {
    if (getNativeModule()) {
      // No-op; permissions are checked via hasPermissions
    }
  },

  startMonitoring: async () => {
    const mod = getNativeModule();
    if (!mod) return;
    // Monitored packages are set via setMonitoredPackages (called by appInterceptionService)
    // The Accessibility Service reads them from SharedPreferences when it receives events
  },

  stopMonitoring: async () => {
    const mod = getNativeModule();
    if (!mod) return;
    mod.setMonitoredPackages([]);
  },

  onAppLaunch: (_callback: (appId: string) => void) => {
    // On Android we don't need a callback: the Accessibility Service launches the app
    // via breathein://overlay, and the app shows the overlay when it opens (see _layout deep link handling)
  },

  getInstalledApps: async (): Promise<AppInfo[]> => {
    const mod = getNativeModule();
    if (!mod) return [];
    const list = await mod.getInstalledApps();
    if (!Array.isArray(list)) return [];
    return list.map((item: { id: string; name: string; category?: string }) => ({
      id: item.id,
      name: item.name,
      category: item.category ?? 'other',
    }));
  },

  hasPermissions: async (): Promise<boolean> => {
    const mod = getNativeModule();
    if (!mod) return false;
    return mod.hasPermissions();
  },

  requestPermissions: async (): Promise<boolean> => {
    const mod = getNativeModule();
    if (!mod) return false;
    await mod.requestPermissions();
    return true;
  },

  setMonitoredPackages: (packageIds: string[]) => {
    const mod = getNativeModule();
    if (!mod) return;
    mod.setMonitoredPackages(packageIds);
  },

  launchApp: async (packageId: string): Promise<boolean> => {
    const mod = getNativeModule();
    if (!mod || typeof mod.launchApp !== 'function') return false;
    await mod.launchApp(packageId);
    return true;
  },
};

export default AppInterceptorAndroid;
