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

// Initialize Firebase (with error handling)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let messaging: Messaging | null = null;
let firebaseInitialized = false;

if (missingKeys.length > 0) {
  console.warn('⚠️ Missing Firebase configuration:', missingKeys);
  console.warn('App will run without Firebase features. To enable Firebase:');
  console.warn('1. Check your .env file');
  console.warn('2. Ensure all EXPO_PUBLIC_FIREBASE_* variables are set');
} else {
  try {
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
      firebaseInitialized = true;
      console.log('✅ Firebase initialized successfully');
    } else {
      app = getApps()[0];
      auth = getAuth(app);
      db = getFirestore(app);
      firebaseInitialized = true;
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.warn('App will continue without Firebase features');
    firebaseInitialized = false;
  }
}

export { app, auth, db, messaging, firebaseInitialized };
