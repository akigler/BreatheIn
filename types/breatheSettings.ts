export interface TimeWindow {
  start: string; // Format: "HH:mm" (24-hour format)
  end: string; // Format: "HH:mm" (24-hour format)
}

export interface AppInfo {
  id: string; // Bundle ID (iOS) or package name (Android)
  name: string;
  icon?: string; // Optional icon URL or local asset
  category?: string;
}

export interface BreatheList {
  id: string;
  name: string;
  apps: AppInfo[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BreatheSettings {
  isEnabled: boolean;
  selectedApps: AppInfo[];
  timeWindows: TimeWindow[];
  breatheLists: BreatheList[];
  defaultBreathingDuration: number; // Duration in seconds
  statistics: {
    totalBreathed: number;
    todayBreathed: number;
    lastBreathedApp?: string;
    lastBreathedTime?: Date;
  };
}
