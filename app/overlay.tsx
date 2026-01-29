import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Placeholder route for breathein://overlay deep link.
 * 
 * With the TRUE OVERLAY approach (SYSTEM_ALERT_WINDOW), this route is rarely hit because
 * the native overlay service shows the breathing UI directly on top of the blocked app.
 * 
 * If this route IS hit (e.g. fallback or legacy behavior), just redirect to home.
 */
export default function OverlayRoute() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home after a short delay
    const t = setTimeout(() => {
      router.replace('/');
    }, 500);
    return () => clearTimeout(t);
  }, [router]);

  return <View style={StyleSheet.absoluteFill} />;
}
