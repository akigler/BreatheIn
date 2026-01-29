import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { appInterceptionService } from '../services/appInterceptionService';
import * as Contacts from 'expo-contacts';

/**
 * In-app "App permissions" style screen – same look as the system screen.
 * Tapping a row opens the relevant system settings.
 */
export default function PermissionsScreen() {
  const router = useRouter();
  const [contactsAllowed, setContactsAllowed] = useState<boolean | null>(null);
  const [accessibilityEnabled, setAccessibilityEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    Contacts.getPermissionsAsync().then(({ status }) =>
      setContactsAllowed(status === 'granted')
    );
    if (Platform.OS === 'android') {
      appInterceptionService.hasPermissions().then(setAccessibilityEnabled);
    } else {
      setAccessibilityEnabled(null);
    }
  }, []);

  const openAppPermissions = () => Linking.openSettings();
  const openAccessibility = () => appInterceptionService.requestPermissions();

  return (
    <View style={styles.container}>
      {/* Header – matches system App permissions */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App permissions</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* App icon + name */}
        <View style={styles.appInfo}>
          <View style={styles.appIcon}>
            <Ionicons name="leaf" size={40} color="#00FFB8" />
          </View>
          <Text style={styles.appName}>Breathe In</Text>
        </View>

        {/* Allowed */}
        <Text style={styles.sectionLabel}>Allowed</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row} onPress={openAppPermissions} activeOpacity={0.7}>
            <Ionicons name="people" size={24} color="#1a1a1a" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Contacts</Text>
            {contactsAllowed !== null && (
              <Text style={styles.rowStatus}>{contactsAllowed ? 'Allowed' : 'Not allowed'}</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          <View style={styles.rowDivider} />
          <TouchableOpacity style={styles.row} onPress={openAppPermissions} activeOpacity={0.7}>
            <Ionicons name="notifications" size={24} color="#1a1a1a" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Not allowed / Other */}
        <Text style={styles.sectionLabel}>Not allowed</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.row} onPress={openAppPermissions} activeOpacity={0.7}>
            <Ionicons name="mic" size={24} color="#1a1a1a" style={styles.rowIcon} />
            <Text style={styles.rowLabel}>Microphone</Text>
            <Text style={styles.rowStatusMuted}>Not allowed</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Accessibility – required for "breathe before apps" */}
        {Platform.OS === 'android' && (
          <>
            <Text style={styles.sectionLabel}>Required for breathing before apps</Text>
            <View style={styles.sectionCard}>
              <TouchableOpacity style={styles.row} onPress={openAccessibility} activeOpacity={0.7}>
                <Ionicons name="accessibility" size={24} color="#1a1a1a" style={styles.rowIcon} />
                <Text style={styles.rowLabel}>Accessibility</Text>
                {accessibilityEnabled !== null && (
                  <Text style={[styles.rowStatus, !accessibilityEnabled && styles.rowStatusMuted]}>
                    {accessibilityEnabled ? 'On' : 'Off'}
                  </Text>
                )}
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              Turn on Accessibility so Breathe In can show a breathing moment when you open selected apps.
            </Text>
          </>
        )}

        {/* Open system App permissions (same screen as your screenshot) */}
        <TouchableOpacity style={styles.openSystemButton} onPress={openAppPermissions} activeOpacity={0.8}>
          <Text style={styles.openSystemButtonText}>Open system App permissions</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerRight: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 12,
  },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 184, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowIcon: {
    marginRight: 16,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  rowStatus: {
    fontSize: 14,
    color: '#0a7c4a',
    fontWeight: '500',
    marginRight: 8,
  },
  rowStatusMuted: {
    color: '#999',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e0e0e0',
    marginLeft: 56,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 24,
    marginHorizontal: 4,
    lineHeight: 18,
  },
  openSystemButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  openSystemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
