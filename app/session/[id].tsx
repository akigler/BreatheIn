import React, { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BreathingExperience } from '../../components/BreathingExperience';
import { useSessionStore } from '../../store/sessionStore';
import { enableShield, disableShield } from '../../native-modules/ScreenShield';

/**
 * Full breathing session screen.
 * Now uses the shared BreathingExperience component for consistency.
 */
export default function BreathingSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isActive, duration, remainingTime, startSession, stopSession } = useSessionStore();
  
  // Session duration in seconds (id is in minutes)
  const sessionDurationSeconds = (parseFloat(id || '5') || 5) * 60;

  // Start session when component mounts
  useEffect(() => {
    if (!isActive && id) {
      const sessionDuration = parseFloat(id) || 5;
      startSession(sessionDuration);
      enableShield();
    }

    return () => {
      disableShield();
    };
  }, []);

  const navigateToHome = useCallback(() => {
    stopSession();
    disableShield();
    router.replace('/(tabs)');
  }, [stopSession, router]);

  const handleComplete = useCallback(() => {
    Alert.alert('Session Complete!', 'Great job completing your breathing session.', [
      {
        text: 'Done',
        onPress: navigateToHome,
      },
    ]);
  }, [navigateToHome]);

  const handleStop = useCallback(() => {
    navigateToHome();
  }, [navigateToHome]);

  return (
    <BreathingExperience
      variant="session"
      duration={sessionDurationSeconds}
      onComplete={handleComplete}
      onStop={handleStop}
      showBackground={true}
      showSounds={true}
      isActive={isActive}
    />
  );
}
