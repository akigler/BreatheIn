import * as Contacts from 'expo-contacts';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { FriendRequest, User } from '../types';

/**
 * Normalize phone number for comparison (remove formatting)
 */
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '').replace(/^1/, ''); // Remove non-digits and leading 1 (US country code)
};

/**
 * Get contacts if permission is already granted (doesn't request permission)
 */
export const getContactsIfGranted = async (): Promise<Contacts.Contact[]> => {
  try {
    const { status } = await Contacts.getPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Contacts permission not granted');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    return data.filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0);
  } catch (error) {
    console.error('Error getting contacts:', error);
    throw error;
  }
};

/**
 * Request contacts permission and get contacts
 */
export const getContacts = async (): Promise<Contacts.Contact[]> => {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Contacts permission not granted');
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
    });

    return data.filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0);
  } catch (error) {
    console.error('Error getting contacts:', error);
    throw error;
  }
};

/**
 * Find contacts who already have the app (matched by phone number)
 */
export const findContactsWithApp = async (contacts: Contacts.Contact[]): Promise<{
  hasApp: Array<{ contact: Contacts.Contact; user: User }>;
  noApp: Contacts.Contact[];
}> => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const hasApp: Array<{ contact: Contacts.Contact; user: User }> = [];
    const noApp: Contacts.Contact[] = [];

    // Get all users with phone numbers
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    // Create a map of normalized phone numbers to users
    const phoneToUser = new Map<string, User>();
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.phoneNumber && data.uid !== auth.currentUser?.uid) {
        const normalized = normalizePhoneNumber(data.phoneNumber);
        phoneToUser.set(normalized, {
          uid: data.uid,
          displayName: data.displayName || `User ${data.uid.slice(0, 6)}`,
          fcmToken: data.fcmToken,
          currentStatus: data.currentStatus || 'idle',
          phoneNumber: data.phoneNumber,
        });
      }
    });

    // Match contacts with users
    for (const contact of contacts) {
      if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) continue;

      let matched = false;
      for (const phoneNumber of contact.phoneNumbers) {
        const normalized = normalizePhoneNumber(phoneNumber.number || '');
        const user = phoneToUser.get(normalized);
        
        if (user) {
          hasApp.push({ contact, user });
          matched = true;
          break;
        }
      }

      if (!matched) {
        noApp.push(contact);
      }
    }

    return { hasApp, noApp };
  } catch (error) {
    console.error('Error finding contacts with app:', error);
    throw error;
  }
};

/**
 * Send a friend invitation
 */
export const sendInvitation = async (
  phoneNumber: string,
  contactName: string
): Promise<string> => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Check if user with this phone number exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNumber', '==', normalizedPhone));
    const snapshot = await getDocs(q);
    
    let receiverId: string | undefined;
    if (!snapshot.empty) {
      receiverId = snapshot.docs[0].data().uid || snapshot.docs[0].id;
    }

    // Check if invitation already exists
    const requestsRef = collection(db, 'friendRequests');
    const existingRequestQuery = query(
      requestsRef,
      where('senderId', '==', auth.currentUser.uid),
      where('receiverPhoneNumber', '==', normalizedPhone),
      where('status', '==', 'pending')
    );
    const existingSnapshot = await getDocs(existingRequestQuery);
    
    if (!existingSnapshot.empty) {
      throw new Error('Invitation already sent to this contact');
    }

    // Create friend request
    const requestData = {
      senderId: auth.currentUser.uid,
      receiverId: receiverId || null,
      receiverPhoneNumber: normalizedPhone,
      receiverName: contactName,
      status: 'pending' as const,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(requestsRef, requestData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw error;
  }
};

/**
 * Get pending invitations (sent and received)
 */
export const getPendingInvitations = async (): Promise<{
  sent: FriendRequest[];
  received: FriendRequest[];
}> => {
  if (!auth.currentUser) {
    return { sent: [], received: [] };
  }

  try {
    const requestsRef = collection(db, 'friendRequests');
    
    // Get sent invitations
    const sentQuery = query(
      requestsRef,
      where('senderId', '==', auth.currentUser.uid),
      where('status', '==', 'pending')
    );
    const sentSnapshot = await getDocs(sentQuery);
    
    const sent: FriendRequest[] = [];
    sentSnapshot.forEach((doc) => {
      const data = doc.data();
      sent.push({
        id: doc.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        receiverPhoneNumber: data.receiverPhoneNumber,
        status: data.status,
        timestamp: data.timestamp?.toDate() || new Date(),
      });
    });

    // Get received invitations
    const receivedQuery = query(
      requestsRef,
      where('receiverId', '==', auth.currentUser.uid),
      where('status', '==', 'pending')
    );
    const receivedSnapshot = await getDocs(receivedQuery);
    
    const received: FriendRequest[] = [];
    receivedSnapshot.forEach((doc) => {
      const data = doc.data();
      received.push({
        id: doc.id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        receiverPhoneNumber: data.receiverPhoneNumber,
        status: data.status,
        timestamp: data.timestamp?.toDate() || new Date(),
      });
    });

    return { sent, received };
  } catch (error) {
    console.error('Error getting pending invitations:', error);
    return { sent: [], received: [] };
  }
};

/**
 * Accept a friend invitation
 */
export const acceptInvitation = async (requestId: string): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const requestData = requestDoc.data();
    
    if (requestData.receiverId !== auth.currentUser.uid) {
      throw new Error('Not authorized to accept this invitation');
    }

    // Update request status
    await updateDoc(requestRef, { status: 'accepted' });

    // Create friendship (bidirectional - store with consistent ordering)
    const friendshipsRef = collection(db, 'friendships');
    const userId1 = requestData.senderId < auth.currentUser.uid 
      ? requestData.senderId 
      : auth.currentUser.uid;
    const userId2 = requestData.senderId < auth.currentUser.uid 
      ? auth.currentUser.uid 
      : requestData.senderId;
    
    const friendshipData = {
      userId1,
      userId2,
      createdAt: serverTimestamp(),
    };

    // Check if friendship already exists
    const existingFriendshipQuery = query(
      friendshipsRef,
      where('userId1', '==', userId1),
      where('userId2', '==', userId2)
    );
    const existingSnapshot = await getDocs(existingFriendshipQuery);
    
    if (existingSnapshot.empty) {
      await addDoc(friendshipsRef, friendshipData);
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Decline a friend invitation
 */
export const declineInvitation = async (requestId: string): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('User not authenticated');
  }

  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestDoc = await getDoc(requestRef);
    
    if (!requestDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const requestData = requestDoc.data();
    
    if (requestData.receiverId !== auth.currentUser.uid) {
      throw new Error('Not authorized to decline this invitation');
    }

    // Update request status
    await updateDoc(requestRef, { status: 'declined' });
  } catch (error) {
    console.error('Error declining invitation:', error);
    throw error;
  }
};

/**
 * Invitation service object for easier imports
 */
export const invitationService = {
  getContacts,
  getContactsIfGranted,
  findContactsWithApp,
  sendInvitation,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
};
