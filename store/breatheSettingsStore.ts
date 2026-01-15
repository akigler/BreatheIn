import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BreatheSettings, AppInfo, TimeWindow, BreatheList } from '../types/breatheSettings';

interface BreatheSettingsStore extends BreatheSettings {
  // Actions
  toggle: () => Promise<void>;
  setSelectedApps: (apps: AppInfo[]) => Promise<void>;
  addApp: (app: AppInfo) => Promise<void>;
  removeApp: (appId: string) => Promise<void>;
  addTimeWindow: (window: TimeWindow) => Promise<void>;
  removeTimeWindow: (index: number) => Promise<void>;
  setTimeWindows: (windows: TimeWindow[]) => Promise<void>;
  addBreatheList: (list: BreatheList) => Promise<void>;
  updateBreatheList: (listId: string, updates: Partial<BreatheList>) => Promise<void>;
  removeBreatheList: (listId: string) => Promise<void>;
  setDefaultBreathingDuration: (duration: number) => Promise<void>;
  incrementBreathedCount: (appId: string) => Promise<void>;
  resetTodayStatistics: () => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
}

const STORAGE_KEY = '@breathe_settings';

const defaultSettings: BreatheSettings = {
  isEnabled: false,
  selectedApps: [],
  timeWindows: [],
  breatheLists: [],
  defaultBreathingDuration: 20, // 20 seconds default
  statistics: {
    totalBreathed: 0,
    todayBreathed: 0,
  },
};

export const useBreatheSettingsStore = create<BreatheSettingsStore>((set, get) => ({
  ...defaultSettings,

  toggle: async () => {
    const newValue = !get().isEnabled;
    set({ isEnabled: newValue });
    await get().saveSettings();
  },

  setSelectedApps: async (apps: AppInfo[]) => {
    set({ selectedApps: apps });
    await get().saveSettings();
  },

  addApp: async (app: AppInfo) => {
    const currentApps = get().selectedApps;
    if (!currentApps.find(a => a.id === app.id)) {
      set({ selectedApps: [...currentApps, app] });
      await get().saveSettings();
    }
  },

  removeApp: async (appId: string) => {
    const currentApps = get().selectedApps;
    set({ selectedApps: currentApps.filter(a => a.id !== appId) });
    await get().saveSettings();
  },

  addTimeWindow: async (window: TimeWindow) => {
    const currentWindows = get().timeWindows;
    set({ timeWindows: [...currentWindows, window] });
    await get().saveSettings();
  },

  removeTimeWindow: async (index: number) => {
    const currentWindows = get().timeWindows;
    set({ timeWindows: currentWindows.filter((_, i) => i !== index) });
    await get().saveSettings();
  },

  setTimeWindows: async (windows: TimeWindow[]) => {
    set({ timeWindows: windows });
    await get().saveSettings();
  },

  addBreatheList: async (list: BreatheList) => {
    const currentLists = get().breatheLists;
    set({ breatheLists: [...currentLists, list] });
    await get().saveSettings();
  },

  updateBreatheList: async (listId: string, updates: Partial<BreatheList>) => {
    const currentLists = get().breatheLists;
    set({
      breatheLists: currentLists.map(list =>
        list.id === listId ? { ...list, ...updates, updatedAt: new Date() } : list
      ),
    });
    await get().saveSettings();
  },

  removeBreatheList: async (listId: string) => {
    const currentLists = get().breatheLists;
    set({ breatheLists: currentLists.filter(list => list.id !== listId) });
    await get().saveSettings();
  },

  setDefaultBreathingDuration: async (duration: number) => {
    set({ defaultBreathingDuration: duration });
    await get().saveSettings();
  },

  incrementBreathedCount: async (appId: string) => {
    const stats = get().statistics;
    const today = new Date();
    const todayStr = today.toDateString();
    const lastBreathedDate = stats.lastBreathedTime?.toDateString();

    // Reset today's count if it's a new day
    const todayBreathed = lastBreathedDate === todayStr ? stats.todayBreathed + 1 : 1;

    set({
      statistics: {
        totalBreathed: stats.totalBreathed + 1,
        todayBreathed,
        lastBreathedApp: appId,
        lastBreathedTime: today,
      },
    });
    await get().saveSettings();
  },

  resetTodayStatistics: async () => {
    const stats = get().statistics;
    set({
      statistics: {
        ...stats,
        todayBreathed: 0,
      },
    });
    await get().saveSettings();
  },

  loadSettings: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        if (parsed.breatheLists) {
          parsed.breatheLists = parsed.breatheLists.map((list: any) => ({
            ...list,
            createdAt: new Date(list.createdAt),
            updatedAt: new Date(list.updatedAt),
          }));
        }
        if (parsed.statistics?.lastBreathedTime) {
          parsed.statistics.lastBreathedTime = new Date(parsed.statistics.lastBreathedTime);
        }
        set({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Error loading breathe settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      const state = get();
      const toStore = {
        isEnabled: state.isEnabled,
        selectedApps: state.selectedApps,
        timeWindows: state.timeWindows,
        breatheLists: state.breatheLists,
        defaultBreathingDuration: state.defaultBreathingDuration,
        statistics: state.statistics,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('Error saving breathe settings:', error);
    }
  },
}));

// Initialize settings on store creation
useBreatheSettingsStore.getState().loadSettings();
