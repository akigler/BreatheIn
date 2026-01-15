import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AppSettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Immediately redirect to breathe-settings
    router.replace('/breathe-settings');
  }, []);

  return null;
}
