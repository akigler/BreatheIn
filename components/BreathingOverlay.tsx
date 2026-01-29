import React from 'react';
import { BreathingExperience } from './BreathingExperience';
import { AppInfo } from '../types/breatheSettings';

interface BreathingOverlayProps {
  visible: boolean;
  appInfo: AppInfo | null;
  duration: number; // Duration in seconds
  onComplete: () => void;
  onSkip?: () => void;
  /** Show nature background instead of dark overlay (default: true) */
  showBackground?: boolean;
  /** Play ambient sounds (default: true) */
  showSounds?: boolean;
}

/**
 * Breathing overlay shown when intercepting app launches.
 * Now uses the shared BreathingExperience component for a consistent,
 * premium experience with nature backgrounds and ambient sounds.
 */
export const BreathingOverlay: React.FC<BreathingOverlayProps> = ({
  visible,
  appInfo,
  duration,
  onComplete,
  onSkip,
  showBackground = true,
  showSounds = true,
}) => {
  return (
    <BreathingExperience
      variant="overlay"
      visible={visible}
      duration={duration}
      onComplete={onComplete}
      onStop={onSkip}
      appInfo={appInfo}
      showBackground={showBackground}
      showSounds={showSounds}
    />
  );
};
