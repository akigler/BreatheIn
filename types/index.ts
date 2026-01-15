export type UserStatus = 'breathing' | 'idle';

export interface User {
  uid: string;
  displayName: string;
  fcmToken?: string;
  currentStatus: UserStatus;
  phoneNumber?: string; // Optional phone number for friend features
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId?: string; // undefined if not registered yet
  receiverPhoneNumber: string;
  status: 'pending' | 'accepted' | 'declined';
  timestamp: Date;
}

export interface Friendship {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: Date;
}

export interface Nudge {
  senderId: string;
  receiverId: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
}

export interface SessionState {
  isActive: boolean;
  duration: number;
  remainingTime: number;
  currentBackground: string;
  startTime: Date | null;
}

// Re-export breathe settings types
export * from './breatheSettings';
