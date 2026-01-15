import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Nudge } from '../types';
import * as Notifications from 'expo-notifications';

/**
 * Send a nudge to a friend
 * Creates a nudge document in Firestore and triggers FCM notification
 */
export const sendNudge = async (receiverId: string): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    // Create nudge document in Firestore
    const nudgeData: Omit<Nudge, 'timestamp'> & { timestamp: any } = {
      senderId: auth.currentUser.uid,
      receiverId,
      timestamp: serverTimestamp(),
      status: 'sent',
    };

    await addDoc(collection(db, 'nudges'), nudgeData);

    // Note: In a production app, you would trigger a Cloud Function here
    // that sends the FCM notification. For MVP, we'll log it.
    console.log(`Nudge sent from ${auth.currentUser.uid} to ${receiverId}`);
    
    // The actual FCM notification will be handled by a Cloud Function
    // that listens to the 'nudges' collection and sends notifications
    // to the receiver's FCM token stored in their user document.
  } catch (error) {
    console.error('Error sending nudge:', error);
    throw error;
  }
};

/**
 * Get nudges for the current user
 */
export const getNudges = async (): Promise<Nudge[]> => {
  if (!auth.currentUser) {
    return [];
  }

  try {
    // This would query the nudges collection
    // For now, we'll return an empty array
    // In production, you'd query: where('receiverId', '==', auth.currentUser.uid)
    return [];
  } catch (error) {
    console.error('Error fetching nudges:', error);
    return [];
  }
};

/**
 * Mark a nudge as read
 */
export const markNudgeAsRead = async (nudgeId: string): Promise<void> => {
  // Implementation for marking nudge as read
  // This would update the nudge document's status to 'read'
};

/**
 * Nudge service object for easier imports
 */
export const nudgeService = {
  sendNudge,
  getNudges,
  markNudgeAsRead,
};
