# Firestore Setup for Friend Invitation System

## Firestore Security Rules

Update your Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Users can read/write their own document
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Users can read other users' basic info if they're friends
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/friendships/$(getFriendshipId(userId, request.auth.uid)));
      
      // Helper function to get friendship document ID
      function getFriendshipId(userId1, userId2) {
        return userId1 < userId2 ? userId1 + '_' + userId2 : userId2 + '_' + userId1;
      }
    }
    
    // Friend Requests collection
    match /friendRequests/{requestId} {
      // Users can read requests they sent or received
      allow read: if request.auth != null && 
        (resource.data.senderId == request.auth.uid || 
         resource.data.receiverId == request.auth.uid);
      
      // Users can create requests they send
      allow create: if request.auth != null && 
        request.resource.data.senderId == request.auth.uid;
      
      // Users can update requests they received
      allow update: if request.auth != null && 
        resource.data.receiverId == request.auth.uid;
    }
    
    // Friendships collection
    match /friendships/{friendshipId} {
      // Users can read friendships they're part of
      allow read: if request.auth != null && 
        (resource.data.userId1 == request.auth.uid || 
         resource.data.userId2 == request.auth.uid);
      
      // Users can create friendships (only through invitation acceptance)
      allow create: if request.auth != null && 
        (request.resource.data.userId1 == request.auth.uid || 
         request.resource.data.userId2 == request.auth.uid);
    }
    
    // Nudges collection
    match /nudges/{nudgeId} {
      // Users can read nudges they sent or received
      allow read: if request.auth != null && 
        (resource.data.senderId == request.auth.uid || 
         resource.data.receiverId == request.auth.uid);
      
      // Users can create nudges they send
      allow create: if request.auth != null && 
        request.resource.data.senderId == request.auth.uid;
    }
  }
}
```

## Firestore Indexes

Create the following composite indexes in Firebase Console → Firestore → Indexes:

### 1. Friend Requests Index
- Collection: `friendRequests`
- Fields:
  - `senderId` (Ascending)
  - `receiverPhoneNumber` (Ascending)
  - `status` (Ascending)
- Query scope: Collection

### 2. Friend Requests by Receiver
- Collection: `friendRequests`
- Fields:
  - `receiverId` (Ascending)
  - `status` (Ascending)
- Query scope: Collection

### 3. Friendships by User 1
- Collection: `friendships`
- Fields:
  - `userId1` (Ascending)
- Query scope: Collection

### 4. Friendships by User 2
- Collection: `friendships`
- Fields:
  - `userId2` (Ascending)
- Query scope: Collection

### 5. Users by Phone Number
- Collection: `users`
- Fields:
  - `phoneNumber` (Ascending)
- Query scope: Collection

## Firebase Authentication Setup

1. **Enable Phone Authentication:**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Phone" authentication
   - Configure reCAPTCHA (for web) or set up app verification (for mobile)

2. **Note:** For production, you'll need to:
   - Set up App Check for additional security
   - Configure phone number verification properly
   - Handle SMS costs (Firebase provides free tier)

## Implementation Notes

- Phone numbers are normalized (digits only, no formatting)
- Friend requests can be sent to phone numbers even if user isn't registered yet
- When a user registers with a phone number that has pending requests, they'll see them
- Friendships are stored bidirectionally for efficient querying
