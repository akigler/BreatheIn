import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, Auth, getAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Validate that all required config values are present
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.error('Missing Firebase configuration:', missingKeys);
  console.error('Current config values:', {
    apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'MISSING',
    authDomain: firebaseConfig.authDomain || 'MISSING',
    projectId: firebaseConfig.projectId || 'MISSING',
    storageBucket: firebaseConfig.storageBucket || 'MISSING',
    messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
    appId: firebaseConfig.appId ? '***' + firebaseConfig.appId.slice(-4) : 'MISSING',
  });
  throw new Error(
    `Missing required Firebase environment variables: ${missingKeys.join(', ')}\n` +
    `Please check your .env file and ensure all EXPO_PUBLIC_FIREBASE_* variables are set.`
  );
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let messaging: Messaging | null = null;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with AsyncStorage persistence for React Native
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (error: any) {
    // If auth is already initialized, get the existing instance
    if (error.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }
  
  db = getFirestore(app);
  
  // Messaging is only available in certain environments
  // For Expo, we'll use expo-notifications instead
  try {
    // Note: Firebase Cloud Messaging web SDK doesn't work in React Native
    // We'll use expo-notifications with FCM backend instead
    messaging = null;
  } catch (error) {
    console.warn('Firebase Messaging not available:', error);
  }
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db, messaging };
