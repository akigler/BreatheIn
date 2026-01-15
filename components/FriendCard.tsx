import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User } from '../types';

interface FriendCardProps {
  friend: User;
  onNudge: (friend: User) => void;
  isNudging?: boolean;
}

export const FriendCard: React.FC<FriendCardProps> = ({ friend, onNudge, isNudging = false }) => {
  const getStatusColor = (status: string) => {
    return status === 'breathing' ? '#FFFFFF' : '#8e8e93';
  };

  const getStatusText = (status: string) => {
    return status === 'breathing' ? 'Breathing' : 'Idle';
  };

  return (
    <View style={styles.card}>
      <View style={styles.friendInfo}>
        <View style={styles.friendHeader}>
          <Text style={styles.friendName}>{friend.displayName}</Text>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(friend.currentStatus) },
            ]}
          />
        </View>
        <Text style={styles.friendStatus}>{getStatusText(friend.currentStatus)}</Text>
      </View>
      <TouchableOpacity
        style={[styles.nudgeButton, isNudging && styles.nudgeButtonDisabled]}
        onPress={() => onNudge(friend)}
        disabled={isNudging}
      >
        <Text style={styles.nudgeButtonText}>Nudge</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  friendStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  nudgeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeButtonDisabled: {
    opacity: 0.6,
  },
  nudgeButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
