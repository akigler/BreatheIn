import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { invitationService } from '../services/invitationService';
import { isLoggedIn } from '../services/authService';

interface ContactWithApp {
  contact: Contacts.Contact;
  user: any;
}

export default function InviteFriendsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [contactsWithApp, setContactsWithApp] = useState<ContactWithApp[]>([]);
  const [contactsWithoutApp, setContactsWithoutApp] = useState<Contacts.Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      Alert.alert('Login Required', 'Please login to add friends');
      router.back();
      return;
    }
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const contactsList = await invitationService.getContacts();
      setContacts(contactsList);

      // Find which contacts have the app
      const { hasApp, noApp } = await invitationService.findContactsWithApp(contactsList);
      setContactsWithApp(hasApp);
      setContactsWithoutApp(noApp);
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      if (error.message.includes('permission')) {
        Alert.alert(
          'Permission Required',
          'Please grant contacts permission to find friends',
          [
            { text: 'Cancel', onPress: () => router.back() },
            { text: 'Settings', onPress: () => {} }, // Could open settings
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to load contacts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (contact: Contacts.Contact) => {
    if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
      Alert.alert('Error', 'Contact has no phone number');
      return;
    }

    const phoneNumber = contact.phoneNumbers[0].number || '';
    const contactName = contact.name || phoneNumber;

    try {
      setInviting(phoneNumber);
      await invitationService.sendInvitation(phoneNumber, contactName);
      Alert.alert('Success', `Invitation sent to ${contactName}!`);
      // Refresh the list
      await loadContacts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setInviting(null);
    }
  };

  const handleAddFriend = async (contactWithApp: ContactWithApp) => {
    const phoneNumber = contactWithApp.contact.phoneNumbers?.[0]?.number || '';
    const contactName = contactWithApp.contact.name || phoneNumber;

    try {
      setInviting(phoneNumber);
      await invitationService.sendInvitation(phoneNumber, contactName);
      Alert.alert('Success', `Friend request sent to ${contactName}!`);
      await loadContacts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    } finally {
      setInviting(null);
    }
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
          <ActivityIndicator size="large" color="#00FFB8" />
          <Text style={styles.loadingText}>Loading contacts...</Text>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0f', '#0d1b2a', '#1a1a2e', '#16213e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add Friends</Text>
          <Text style={styles.subtitle}>Invite friends from your contacts</Text>
        </View>

        {/* Contacts with App */}
        {contactsWithApp.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contacts on Breathe In</Text>
            {contactsWithApp.map((item, index) => (
              <View key={index} style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{getContactDisplayName(item.contact)}</Text>
                  <Text style={styles.contactPhone}>{getContactPhone(item.contact)}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    inviting === getContactPhone(item.contact) && styles.addButtonDisabled,
                  ]}
                  onPress={() => handleAddFriend(item)}
                  disabled={inviting === getContactPhone(item.contact)}
                >
                  {inviting === getContactPhone(item.contact) ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.addButtonText}>Add Friend</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Contacts without App */}
        {contactsWithoutApp.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invite to Breathe In</Text>
            {contactsWithoutApp.slice(0, 50).map((contact, index) => (
              <View key={index} style={styles.contactCard}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{getContactDisplayName(contact)}</Text>
                  <Text style={styles.contactPhone}>{getContactPhone(contact)}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.inviteButton,
                    inviting === getContactPhone(contact) && styles.inviteButtonDisabled,
                  ]}
                  onPress={() => handleInvite(contact)}
                  disabled={inviting === getContactPhone(contact)}
                >
                  {inviting === getContactPhone(contact) ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.inviteButtonText}>Invite</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
            {contactsWithoutApp.length > 50 && (
              <Text style={styles.moreText}>
                And {contactsWithoutApp.length - 50} more contacts...
              </Text>
            )}
          </View>
        )}

        {contactsWithApp.length === 0 && contactsWithoutApp.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No contacts found</Text>
            <Text style={styles.emptySubtext}>
              Make sure you have contacts with phone numbers
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
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
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#00FFB8',
    fontSize: 18,
    fontWeight: '600',
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  contactCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  addButton: {
    backgroundColor: 'rgba(0, 255, 184, 0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 184, 0.3)',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButton: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 184, 0.2)',
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    color: '#00FFB8',
    fontSize: 16,
    fontWeight: '600',
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
  },
  moreText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
