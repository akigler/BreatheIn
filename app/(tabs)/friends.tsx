import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, TextInput, Modal } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { invitationService } from '../../services/invitationService';
import { groupService, ContactGroup } from '../../services/groupService';

type TabType = 'contacts' | 'groups';

export default function FriendsScreen() {
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contacts.Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('contacts');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadContacts();
    loadGroups();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadContacts();
      loadGroups();
    }, [])
  );

  // Filter contacts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact => {
      const name = (contact.name || '').toLowerCase();
      const phone = (contact.phoneNumbers?.[0]?.number || '').toLowerCase();
      return name.includes(query) || phone.includes(query);
    });
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      
      // First check permission status
      const { status } = await Contacts.getPermissionsAsync();
      
      // If not granted, request it (this will show the system dialog if they said no before)
      if (status !== 'granted') {
        const { status: newStatus } = await Contacts.requestPermissionsAsync();
        
        if (newStatus !== 'granted') {
          setLoading(false);
          Alert.alert(
            'Permission Required',
            'Please grant contacts permission to send messages to your friends.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Try Again', onPress: () => loadContacts() },
            ]
          );
          return;
        }
      }
      
      // Permission granted, load contacts (using getContactsIfGranted to avoid re-requesting)
      const contactsList = await invitationService.getContactsIfGranted();
      setContacts(contactsList);
      setFilteredContacts(contactsList);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      if (error.message?.includes('permission')) {
        Alert.alert(
          'Permission Required',
          'Please grant contacts permission to send messages',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'OK', onPress: () => loadContacts() },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load contacts');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const groupsList = await groupService.getGroups();
      setGroups(groupsList);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleSendMessage = async (contact: Contacts.Contact) => {
    if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
      Alert.alert('Error', 'Contact has no phone number');
      return;
    }

    const phoneNumber = contact.phoneNumbers[0].number || '';
    const contactName = contact.name || phoneNumber;
    const message = 'Take a breathe 🧘';

    try {
      setSending(phoneNumber);
      
      // Format phone number for SMS (remove non-digits)
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Open SMS app with pre-filled message
      const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(smsUrl);
      
      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        // Fallback: try without body parameter
        const smsUrlFallback = `sms:${cleanPhone}`;
        await Linking.openURL(smsUrlFallback);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to open messaging app. Please try again.');
    } finally {
      setSending(null);
    }
  };

  const handleSendToGroup = async (group: ContactGroup) => {
    try {
      const groupContacts = await groupService.getGroupContacts(group, contacts);
      const contactsWithPhones = groupContacts.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
      
      if (contactsWithPhones.length === 0) {
        Alert.alert('Error', 'No contacts in this group have phone numbers');
        return;
      }

      const message = 'Take a breathe 🧘';
      
      // For groups, we'll send to the first contact and let user add others manually
      // iOS/Android don't support group SMS via URL scheme easily
      const firstContact = contactsWithPhones[0];
      const phoneNumber = firstContact.phoneNumbers![0].number || '';
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      
      // Create a comma-separated list of phone numbers for group SMS
      const phoneNumbers = contactsWithPhones
        .map(c => c.phoneNumbers![0].number?.replace(/\D/g, ''))
        .filter((p): p is string => !!p);
      
      // Try group SMS (works on some platforms)
      const smsUrl = `sms:${phoneNumbers.join(',')}?body=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(smsUrl);
      
      if (canOpen) {
        await Linking.openURL(smsUrl);
      } else {
        // Fallback: send to first contact
        const smsUrlFallback = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
        await Linking.openURL(smsUrlFallback);
        Alert.alert(
          'Group Message',
          `Opened message to first contact. You can add ${contactsWithPhones.length - 1} more recipients manually.`
        );
      }
    } catch (error: any) {
      console.error('Error sending group message:', error);
      Alert.alert('Error', 'Failed to open messaging app. Please try again.');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedContacts.size === 0) {
      Alert.alert('Error', 'Please select at least one contact');
      return;
    }

    try {
      await groupService.createGroup(newGroupName.trim(), Array.from(selectedContacts));
      await loadGroups();
      setShowCreateGroup(false);
      setNewGroupName('');
      setSelectedContacts(new Set());
      setActiveTab('groups');
      Alert.alert('Success', 'Group created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupService.deleteGroup(groupId);
              await loadGroups();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete group');
            }
          },
        },
      ]
    );
  };

  const toggleContactSelection = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const getContactDisplayName = (contact: Contacts.Contact): string => {
    return contact.name || contact.phoneNumbers?.[0]?.number || 'Unknown';
  };

  const getContactPhone = (contact: Contacts.Contact): string => {
    return contact.phoneNumbers?.[0]?.number || '';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>Send a message to breathe together</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'contacts' && styles.tabActive]}
            onPress={() => setActiveTab('contacts')}
          >
            <Text style={[styles.tabText, activeTab === 'contacts' && styles.tabTextActive]}>
              Contacts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'groups' && styles.tabActive]}
            onPress={() => setActiveTab('groups')}
          >
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
              Groups
            </Text>
          </TouchableOpacity>
        </View>

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <View style={styles.tabContent}>
            <TouchableOpacity
              style={styles.createGroupButton}
              onPress={() => setShowCreateGroup(true)}
            >
              <Text style={styles.createGroupButtonText}>+ Create Group</Text>
            </TouchableOpacity>

            {groups.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No groups yet</Text>
                <Text style={styles.emptySubtext}>
                  Create a group to send messages to multiple contacts at once
                </Text>
              </View>
            ) : (
              <View style={styles.groupsList}>
                {groups.map((group) => {
                  const groupContacts = contacts.filter(c => 
                    c.id && group.contactIds.includes(c.id)
                  );
                  return (
                    <View key={group.id} style={styles.groupCard}>
                      <View style={styles.groupInfo}>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupCount}>
                          {groupContacts.length} {groupContacts.length === 1 ? 'contact' : 'contacts'}
                        </Text>
                      </View>
                      <View style={styles.groupActions}>
                        <TouchableOpacity
                          style={styles.sendGroupButton}
                          onPress={() => handleSendToGroup(group)}
                        >
                          <Text style={styles.sendGroupButtonText}>Send</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteGroupButton}
                          onPress={() => handleDeleteGroup(group.id, group.name)}
                        >
                          <Text style={styles.deleteGroupButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <View style={styles.tabContent}>
            {filteredContacts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No contacts found' : 'No contacts found'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery 
                    ? 'Try a different search term'
                    : 'Make sure you have contacts with phone numbers'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity style={styles.retryButton} onPress={loadContacts}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.contactsList}>
                {filteredContacts.slice(0, 100).map((contact, index) => (
                  <View key={contact.id || index} style={styles.contactCard}>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{getContactDisplayName(contact)}</Text>
                      <Text style={styles.contactPhone}>{getContactPhone(contact)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.messageButton,
                        sending === getContactPhone(contact) && styles.messageButtonDisabled,
                      ]}
                      onPress={() => handleSendMessage(contact)}
                      disabled={sending === getContactPhone(contact)}
                    >
                      {sending === getContactPhone(contact) ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.messageButtonText}>Send</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
                {filteredContacts.length > 100 && (
                  <Text style={styles.moreText}>
                    Showing first 100 contacts. {filteredContacts.length - 100} more available.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroup}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateGroup(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCreateGroup(false);
            setNewGroupName('');
            setSelectedContacts(new Set());
          }}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Group</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Group name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />

            <Text style={styles.modalSubtitle}>Select Contacts ({selectedContacts.size} selected)</Text>
            
            <ScrollView style={styles.modalContactsList}>
              {contacts.map((contact, index) => {
                const isSelected = contact.id ? selectedContacts.has(contact.id) : false;
                return (
                  <TouchableOpacity
                    key={contact.id || index}
                    style={[
                      styles.modalContactItem,
                      isSelected && styles.modalContactItemSelected,
                    ]}
                    onPress={() => contact.id && toggleContactSelection(contact.id)}
                  >
                    <Text style={styles.modalContactName}>{getContactDisplayName(contact)}</Text>
                    {isSelected && <Text style={styles.modalCheckmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateGroup(false);
                  setNewGroupName('');
                  setSelectedContacts(new Set());
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCreateButton}
                onPress={handleCreateGroup}
              >
                <Text style={styles.modalCreateButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '300',
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabActive: {
    backgroundColor: 'rgba(0, 255, 184, 0.2)',
    borderColor: 'rgba(0, 255, 184, 0.4)',
  },
  tabText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#00FFB8',
  },
  tabContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 184, 0.2)',
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createGroupButton: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 184, 0.2)',
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  groupsList: {
    gap: 12,
  },
  groupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  groupInfo: {
    marginBottom: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  groupCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  groupActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sendGroupButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 184, 0.8)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 184, 0.3)',
  },
  sendGroupButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteGroupButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  deleteGroupButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  contactsList: {
    gap: 12,
  },
  contactCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  contactPhone: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  messageButton: {
    backgroundColor: 'rgba(0, 255, 184, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 184, 0.3)',
  },
  messageButtonDisabled: {
    opacity: 0.6,
  },
  messageButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  moreText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#000',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  modalContactsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  modalContactItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalContactItemSelected: {
    backgroundColor: 'rgba(0, 255, 184, 0.2)',
    borderColor: 'rgba(0, 255, 184, 0.4)',
  },
  modalContactName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  modalCheckmark: {
    fontSize: 20,
    color: '#00FFB8',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCreateButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 255, 184, 0.8)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 184, 0.3)',
  },
  modalCreateButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
