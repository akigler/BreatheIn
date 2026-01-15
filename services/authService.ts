import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  linkWithCredential,
  RecaptchaVerifier
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, firebaseInitialized } from './firebaseConfig';
import { User, UserStatus } from '../types';
import * as Notifications from 'expo-notifications';

let currentUser: User | null = null;

/**
 * Initialize anonymous authentication
 */
export const initializeAuth = async (): Promise<User> => {
  if (!firebaseInitialized || !auth || !db) {
    throw new Error('Firebase is not initialized. Please check your Firebase configuration.');
  }
  
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      unsubscribe();
      
      if (firebaseUser) {
        try {
          const user = await getUserData(firebaseUser.uid);
          currentUser = user;
          resolve(user);
        } catch (error) {
          reject(error);
        }
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          const user = await createUserDocument(userCredential.user.uid);
          currentUser = user;
          resolve(user);
        } catch (error: any) {
          // Provide helpful error messages for common Firebase Auth errors
          if (error?.code === 'auth/configuration-not-found') {
            const helpfulError = new Error(
              'Firebase Anonymous Authentication is not enabled. Please enable it in Firebase Console:\n' +
              '1. Go to Firebase Console → Authentication\n' +
              '2. Click "Get started" if needed\n' +
              '3. Go to "Sign-in method" tab\n' +
              '4. Enable "Anonymous" authentication'
            );
            helpfulError.name = 'FirebaseConfigurationError';
            reject(helpfulError);
          } else if (error?.code === 'auth/operation-not-allowed') {
            const helpfulError = new Error(
              'Anonymous sign-in is not enabled for this Firebase project. Please enable it in Firebase Console.'
            );
            helpfulError.name = 'FirebaseConfigurationError';
            reject(helpfulError);
          } else {
            console.error('Firebase Auth Error:', error);
            reject(error);
          }
        }
      }
    });
  });
};

/**
 * Create a new user document in Firestore
 */
const createUserDocument = async (uid: string): Promise<User> => {
  const fcmToken = await getFCMToken();
  
  // Build user data object, only including fcmToken if it's defined
  // Firestore doesn't allow undefined values
  const userData: any = {
    uid,
    displayName: `User ${uid.slice(0, 6)}`, // Generate a simple display name
    currentStatus: 'idle',
  };
  
  // Note: phoneNumber will be added when user links phone to account

  // Only add fcmToken if it exists (not undefined)
  if (fcmToken) {
    userData.fcmToken = fcmToken;
  }

  await setDoc(doc(db, 'users', uid), userData);
  
  // Return User object with optional fcmToken
  return {
    uid,
    displayName: userData.displayName,
    fcmToken,
    currentStatus: 'idle',
    phoneNumber: userData.phoneNumber,
  };
};

/**
 * Get user data from Firestore
 */
const getUserData = async (uid: string): Promise<User> => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  
  if (!userDoc.exists()) {
    return createUserDocument(uid);
  }

  const data = userDoc.data();
  return {
    uid,
    displayName: data.displayName || `User ${uid.slice(0, 6)}`,
    fcmToken: data.fcmToken,
    currentStatus: data.currentStatus || 'idle',
    phoneNumber: data.phoneNumber,
  };
};

/**
 * Get FCM token for push notifications
 */
const getFCMToken = async (): Promise<string | undefined> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return undefined;
    }

    // Don't pass projectId - let Expo auto-detect it
    // The Firebase project ID is not the same as Expo project ID
    const token = await Notifications.getExpoPushTokenAsync();

    return token.data;
  } catch (error) {
    // Silently fail - notifications are optional
    // This is expected in Expo Go and during development
    console.warn('Could not get Expo push token (this is normal in Expo Go):', error);
    return undefined;
  }
};

/**
 * Update user's FCM token
 */
export const updateFCMToken = async (): Promise<void> => {
  if (!auth.currentUser) return;

  const token = await getFCMToken();
  // Only update if we have a valid token
  // Firestore doesn't allow undefined values
  if (token) {
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      { fcmToken: token },
      { merge: true }
    );
    
    if (currentUser) {
      currentUser.fcmToken = token;
    }
  }
};

/**
 * Update user's current status
 */
export const updateUserStatus = async (status: UserStatus): Promise<void> => {
  if (!auth.currentUser) return;

  await setDoc(
    doc(db, 'users', auth.currentUser.uid),
    { currentStatus: status },
    { merge: true }
  );

  if (currentUser) {
    currentUser.currentStatus = status;
  }
};

/**
 * Check if current user is logged in (not anonymous)
 */
export const isLoggedIn = (): boolean => {
  if (!auth.currentUser) return false;
  // Anonymous users don't have phone number or email
  return !auth.currentUser.isAnonymous;
};

/**
 * Sign in with phone number
 * For React Native, we'll use a simplified flow
 * Note: Full phone auth requires native setup - this is a placeholder
 */
export const signInWithPhone = async (phoneNumber: string): Promise<{ verificationId: string }> => {
  // Note: In production, you'd use Firebase Phone Auth with reCAPTCHA
  // For Expo, you may need to use a different approach or native modules
  // This is a simplified version - you'll need to configure Firebase Phone Auth properly
  
  try {
    // Format phone number (remove non-digits, add country code if needed)
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    
    // For now, we'll create a mock verification flow
    // In production, replace this with actual Firebase Phone Auth
    const verificationId = `mock_${Date.now()}`;
    
    return { verificationId };
  } catch (error) {
    console.error('Error initiating phone sign in:', error);
    throw error;
  }
};

/**
 * Verify phone number code and link to anonymous account
 */
export const verifyPhoneCode = async (
  verificationId: string, 
  code: string, 
  phoneNumber: string
): Promise<User> => {
  try {
    if (!auth.currentUser) {
      throw new Error('No user logged in');
    }

    // In production, verify the code with Firebase
    // For now, we'll directly link the phone number to the user
    
    // Update user document with phone number
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      { phoneNumber: formattedPhone },
      { merge: true }
    );

    // Update current user
    if (currentUser) {
      currentUser.phoneNumber = formattedPhone;
    }

    // Reload user data
    const user = await getUserData(auth.currentUser.uid);
    currentUser = user;
    
    return user;
  } catch (error) {
    console.error('Error verifying phone code:', error);
    throw error;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = (): User | null => {
  return currentUser;
};

/**
 * Sign out (for future use)
 */
export const signOut = async (): Promise<void> => {
  // Note: Anonymous auth doesn't have a signOut in the traditional sense
  // This would be used if we upgrade to full authentication
  currentUser = null;
};
