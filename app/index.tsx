import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure router is ready, then always show breathing screen
    const timer = setTimeout(() => {
      router.replace('/onboarding-breathing');
      setIsReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Show loading screen briefly
  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#00FFB8" />
    </View>
  );
}
