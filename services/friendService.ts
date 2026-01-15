import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { User, UserStatus } from '../types';
import { updateFCMToken } from './authService';

/**
 * Get friends from accepted friendships
 */
export const getFriends = async (): Promise<User[]> => {
  if (!auth.currentUser) {
    return [];
  }

  try {
    const friendshipsRef = collection(db, 'friendships');
    
    // Get friendships where current user is userId1 or userId2
    const q1 = query(friendshipsRef, where('userId1', '==', auth.currentUser.uid));
    const q2 = query(friendshipsRef, where('userId2', '==', auth.currentUser.uid));
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2),
    ]);

    const friendIds = new Set<string>();
    
    snapshot1.forEach((doc) => {
      const data = doc.data();
      if (data.userId2) {
        friendIds.add(data.userId2);
      }
    });
    
    snapshot2.forEach((doc) => {
      const data = doc.data();
      if (data.userId1) {
        friendIds.add(data.userId1);
      }
    });

    // Fetch user data for all friends
    const friends: User[] = [];
    const usersRef = collection(db, 'users');
    
    for (const friendId of friendIds) {
      const userDoc = await getDoc(doc(usersRef, friendId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        friends.push({
          uid: data.uid,
          displayName: data.displayName || `User ${data.uid.slice(0, 6)}`,
          fcmToken: data.fcmToken,
          currentStatus: data.currentStatus || 'idle',
          phoneNumber: data.phoneNumber,
        });
      }
    }

    return friends;
  } catch (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
};

/**
 * Subscribe to real-time updates of friends' status
 */
export const subscribeToFriends = (
  callback: (friends: User[]) => void
): (() => void) => {
  if (!auth.currentUser) {
    return () => {};
  }

  // Subscribe to friendships changes
  const friendshipsRef = collection(db, 'friendships');
  const q1 = query(friendshipsRef, where('userId1', '==', auth.currentUser.uid));
  const q2 = query(friendshipsRef, where('userId2', '==', auth.currentUser.uid));

  let friendIds = new Set<string>();

  const updateFriends = async () => {
    const usersRef = collection(db, 'users');
    const friends: User[] = [];
    
    for (const friendId of friendIds) {
      const userDoc = await getDoc(doc(usersRef, friendId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        friends.push({
          uid: data.uid,
          displayName: data.displayName || `User ${data.uid.slice(0, 6)}`,
          fcmToken: data.fcmToken,
          currentStatus: data.currentStatus || 'idle',
          phoneNumber: data.phoneNumber,
        });
      }
    }
    
    callback(friends);
  };

  let snapshot1Ready = false;
  let snapshot2Ready = false;

  const checkAndUpdate = () => {
    if (snapshot1Ready && snapshot2Ready) {
      updateFriends();
    }
  };

  const unsubscribe1 = onSnapshot(
    q1,
    (snapshot) => {
      friendIds.clear();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId2) friendIds.add(data.userId2);
      });
      snapshot1Ready = true;
      checkAndUpdate();
    },
    (error) => {
      console.error('Error in friends subscription:', error);
    }
  );

  const unsubscribe2 = onSnapshot(
    q2,
    (snapshot) => {
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.userId1) friendIds.add(data.userId1);
      });
      snapshot2Ready = true;
      checkAndUpdate();
    },
    (error) => {
      console.error('Error in friends subscription:', error);
    }
  );

  return () => {
    unsubscribe1();
    unsubscribe2();
  };
};

/**
 * Get friend requests
 */
export const getFriendRequests = async (): Promise<{
  sent: any[];
  received: any[];
}> => {
  // This will be handled by invitationService
  return { sent: [], received: [] };
};

/**
 * Update current user's FCM token
 * Should be called when the app starts or token refreshes
 */
export const refreshFCMToken = async (): Promise<void> => {
  await updateFCMToken();
};

/**
 * Friend service object for easier imports
 */
export const friendService = {
  getFriends,
  subscribeToFriends,
  refreshFCMToken,
};
