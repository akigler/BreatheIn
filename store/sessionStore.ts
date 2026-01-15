import { create } from 'zustand';
import { SessionState } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SessionStore extends SessionState {
  lastSelectedDuration: number; // in seconds
  startSession: (duration: number, background?: string) => void;
  pauseSession: () => void;
  stopSession: () => void;
  updateRemainingTime: (time: number) => void;
  setBackground: (background: string) => void;
  setLastSelectedDuration: (duration: number) => void; // in seconds
  loadLastSelectedDuration: () => Promise<void>;
}

const DEFAULT_DURATION_SECONDS = 3 * 60; // 3 minutes default

export const useSessionStore = create<SessionStore>((set, get) => ({
  isActive: false,
  duration: 5, // minutes
  remainingTime: 5 * 60, // seconds
  currentBackground: '',
  startTime: null,
  lastSelectedDuration: DEFAULT_DURATION_SECONDS,

  startSession: (duration: number, background?: string) => {
    const startTime = new Date();
    set({
      isActive: true,
      duration,
      remainingTime: duration * 60, // Convert minutes to seconds
      startTime,
      currentBackground: background || '',
    });
  },

  pauseSession: () => {
    set({ isActive: false });
  },

  stopSession: () => {
    set({
      isActive: false,
      remainingTime: 0,
      startTime: null,
    });
  },

  updateRemainingTime: (time: number) => {
    set({ remainingTime: Math.max(0, time) });
  },

  setBackground: (background: string) => {
    set({ currentBackground: background });
  },

  setLastSelectedDuration: async (duration: number) => {
    set({ lastSelectedDuration: duration });
    await AsyncStorage.setItem('lastSelectedDuration', duration.toString());
  },

  loadLastSelectedDuration: async () => {
    try {
      const stored = await AsyncStorage.getItem('lastSelectedDuration');
      if (stored) {
        const duration = parseInt(stored, 10);
        if (!isNaN(duration)) {
          set({ lastSelectedDuration: duration });
        }
      }
    } catch (error) {
      console.error('Error loading last selected duration:', error);
    }
  },
}));
