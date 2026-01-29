import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useBreatheSettingsStore } from '../store/breatheSettingsStore';
import { BreatheList, TimeWindow } from '../types/breatheSettings';
import { appInterceptionService } from '../services/appInterceptionService';

// Safely import the native module function
let getAppInterceptorModule: (() => any) | null = null;
try {
  const appInterceptorModule = require('../native-modules/AppInterceptor');
  getAppInterceptorModule = appInterceptorModule.getAppInterceptorModule;
} catch (error) {
  console.warn('Failed to load AppInterceptor module:', error);
  getAppInterceptorModule = () => null;
}

export default function BreatheSettingsScreen() {
  const router = useRouter();
  const {
    isEnabled,
    selectedApps,
    timeWindows,
    breatheLists,
    defaultBreathingDuration,
    statistics,
    toggle,
    setTimeWindows,
    addBreatheList,
    removeBreatheList,
    loadSettings,
  } = useBreatheSettingsStore();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTimeWindow, setEditingTimeWindow] = useState<TimeWindow | null>(null);
  const [timeWindowIndex, setTimeWindowIndex] = useState<number>(-1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [accessibilityEnabled, setAccessibilityEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const checkAccessibility = async () => {
      if (Platform.OS !== 'android') return;
      try {
        const enabled = await appInterceptionService.hasPermissions();
        setAccessibilityEnabled(enabled);
      } catch {
        setAccessibilityEnabled(false);
      }
    };
    checkAccessibility();
  }, [isEnabled]);

  const handleToggle = async () => {
    const newValue = !isEnabled;
    
    // If enabling, check and request permissions first
    if (newValue) {
      try {
        if (!getAppInterceptorModule) {
          // Show settings alert and allow toggle anyway
          if (Platform.OS === 'ios') {
            Alert.alert(
              'Screen Time Permission Required',
              'To enable breathe interception, you need to grant Screen Time permissions. Please go to Settings > Screen Time and enable permissions for this app.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => {} },
                {
                  text: 'Open Settings',
                  onPress: async () => {
                    await Linking.openSettings();
                    // Enable toggle after opening settings
                    await toggle();
                  },
                },
              ]
            );
          } else {
            Alert.alert(
              'Accessibility Permission Required',
              'To enable breathe interception, you need to enable Accessibility Service. Please go to Settings > Accessibility and enable this app.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => {} },
                {
                  text: 'Open Settings',
                  onPress: async () => {
                    await Linking.openSettings();
                    // Enable toggle after opening settings
                    await toggle();
                  },
                },
              ]
            );
          }
          return;
        }

        const nativeModule = getAppInterceptorModule();
        
        if (!nativeModule) {
          // Show settings alert and allow toggle anyway
          if (Platform.OS === 'ios') {
            Alert.alert(
              'Screen Time Permission Required',
              'To enable breathe interception, you need to grant Screen Time permissions. Please go to Settings > Screen Time and enable permissions for this app.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => {} },
                {
                  text: 'Open Settings',
                  onPress: async () => {
                    await Linking.openSettings();
                    // Enable toggle after opening settings
                    await toggle();
                  },
                },
              ]
            );
          } else {
            Alert.alert(
              'Accessibility Permission Required',
              'To enable breathe interception, you need to enable Accessibility Service. Please go to Settings > Accessibility and enable this app.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => {} },
                {
                  text: 'Open Settings',
                  onPress: async () => {
                    await Linking.openSettings();
                    // Enable toggle after opening settings
                    await toggle();
                  },
                },
              ]
            );
          }
          return;
        }

        // Try to check permissions (may fail with placeholder modules)
        let hasPermissions = false;
        try {
          hasPermissions = await nativeModule.hasPermissions();
        } catch (error) {
          console.warn('Could not check permissions (placeholder module):', error);
        }
        
        if (!hasPermissions) {
          // Show popup that sends user to the right settings (Accessibility on Android, app settings on iOS)
          if (Platform.OS === 'android') {
            Alert.alert(
              'Enable Breathe In',
              'To show a breathing moment before opening selected apps, turn on "Breathe In" in Accessibility. In the next screen, find Breathe In in the list and turn it on.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => {} },
                {
                  text: 'Open Accessibility Settings',
                  onPress: async () => {
                    try {
                      await nativeModule.requestPermissions();
                      // Opens Settings > Accessibility; user enables the service and returns
                      // They can turn the toggle on again when back
                    } catch (error) {
                      console.warn('Could not open Accessibility settings:', error);
                      Linking.openSettings();
                    }
                  },
                },
              ]
            );
            return;
          }
          if (Platform.OS === 'ios') {
            Alert.alert(
              'Screen Time Permission Required',
              'To enable breathe interception, you need to grant Screen Time permissions. Please go to Settings > Screen Time and enable permissions for this app.',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => {} },
                {
                  text: 'Open Settings',
                  onPress: async () => {
                    await Linking.openSettings();
                    try {
                      await nativeModule.initialize();
                      await appInterceptionService.startMonitoring();
                      await toggle();
                    } catch (error) {
                      console.error('Error initializing after settings:', error);
                      await toggle();
                    }
                  },
                },
              ]
            );
            return;
          }
        }

        // Permissions granted, initialize and start monitoring
        try {
          await nativeModule.initialize();
          await appInterceptionService.startMonitoring();
        } catch (error) {
          console.warn('Error initializing monitoring (may be placeholder):', error);
        }
        
        // Enable the toggle
        await toggle();
      } catch (error) {
        console.error('Error enabling breathe interception:', error);
        // Still allow toggle to be enabled - user can configure permissions manually
        Alert.alert(
          'Permission Setup Required',
          Platform.OS === 'ios'
            ? 'Please enable Screen Time permissions in Settings > Screen Time, then try again.'
            : 'Please enable Accessibility Service in Settings > Accessibility, then try again.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => {} },
            {
              text: 'Open Settings',
              onPress: async () => {
                await Linking.openSettings();
                await toggle();
              },
            },
          ]
        );
      }
    } else {
      // Disabling - just stop monitoring and toggle
      try {
        await appInterceptionService.stopMonitoring();
        await toggle();
      } catch (error) {
        console.error('Error disabling breathe interception:', error);
        // Still toggle off even if there's an error stopping
        await toggle();
      }
    }
  };

  const handleAddTimeWindow = () => {
    setEditingTimeWindow(null);
    setTimeWindowIndex(-1);
    setStartTime('09:00');
    setEndTime('17:00');
    setShowTimePicker(true);
  };

  const handleEditTimeWindow = (window: TimeWindow, index: number) => {
    setEditingTimeWindow(window);
    setTimeWindowIndex(index);
    setStartTime(window.start);
    setEndTime(window.end);
    setShowTimePicker(true);
  };

  const handleSaveTimeWindow = async () => {
    const newWindow: TimeWindow = { start: startTime, end: endTime };
    const currentWindows = [...timeWindows];

    if (editingTimeWindow && timeWindowIndex >= 0) {
      currentWindows[timeWindowIndex] = newWindow;
    } else {
      currentWindows.push(newWindow);
    }

    await setTimeWindows(currentWindows);
    setShowTimePicker(false);
  };

  const handleRemoveTimeWindow = async (index: number) => {
    Alert.alert(
      'Remove Time Window?',
      'Are you sure you want to remove this time window?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const newWindows = timeWindows.filter((_, i) => i !== index);
            await setTimeWindows(newWindows);
          },
        },
      ]
    );
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    const newList: BreatheList = {
      id: Date.now().toString(),
      name: newListName.trim(),
      apps: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await addBreatheList(newList);
    setNewListName('');
    setShowCreateList(false);
    router.push(`/breathe-list/${newList.id}`);
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    Alert.alert(
      'Delete Breathe List?',
      `Are you sure you want to delete "${listName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeBreatheList(listId);
          },
        },
      ]
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isWithinTimeWindow = (window: TimeWindow): boolean => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTime >= window.start && currentTime <= window.end;
  };

  const getActiveTimeWindows = () => {
    return timeWindows.filter(isWithinTimeWindow);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Breathe Settings</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Android: Accessibility status and shortcut */}
        {Platform.OS === 'android' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="accessibility" size={20} color="#fff" style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Accessibility</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Breathe In needs to be turned on in Android Accessibility so it can show a breathing moment when you open selected apps. This is separate from "All permissions" in app info.
            </Text>
            {accessibilityEnabled === true ? (
              <View style={styles.accessibilityStatusRow}>
                <Ionicons name="checkmark-circle" size={24} color="#00FFB8" />
                <Text style={styles.accessibilityStatusText}>Breathe In is enabled in Accessibility</Text>
              </View>
            ) : (
              <>
                <View style={styles.accessibilityStatusRow}>
                  <Ionicons name="warning" size={24} color="#FFB800" />
                  <Text style={styles.accessibilityStatusTextWarning}>
                    {accessibilityEnabled === false ? 'Not enabled' : 'Checking…'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.appPermissionsButton}
                  onPress={() => router.push('/permissions')}
                >
                  <Text style={styles.appPermissionsButtonText}>App permissions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.openAccessibilityButton}
                  onPress={async () => {
                    try {
                      await appInterceptionService.requestPermissions();
                    } catch {
                      Linking.openSettings();
                    }
                  }}
                >
                  <Text style={styles.openAccessibilityButtonText}>Open Accessibility Settings</Text>
                </TouchableOpacity>
                <Text style={styles.accessibilitySteps}>
                  1. In the next screen, find "Breathe In" in the list{'\n'}
                  2. Tap it and turn the switch On
                </Text>
              </>
            )}
          </View>
        )}

        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Enable Breathe Interception</Text>
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#767577', true: '#00FFB8' }}
              thumbColor={isEnabled ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.sectionDescription}>
            When enabled, selected apps will trigger a breathing session before you can use them.
          </Text>
        </View>

        {/* Statistics */}
        {statistics.todayBreathed > 0 && (
          <View style={styles.section}>
            <Text style={styles.statisticsTitle}>Today's Stats</Text>
            <Text style={styles.statisticsText}>
              💎 Breathed: {statistics.todayBreathed}x Today
            </Text>
            {statistics.lastBreathedApp && (
              <Text style={styles.statisticsText}>
                Last: {statistics.lastBreathedApp}
              </Text>
            )}
          </View>
        )}

        {/* Breathe Lists */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={20} color="#fff" style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Breathe Lists</Text>
            </View>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateList(true)}
            >
              <Text style={styles.createButtonText}>Create New +</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDescription}>
            Breathe Lists: only these apps will trigger breathing during your session.
          </Text>

          {breatheLists.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No breathe lists yet</Text>
              <Text style={styles.emptyStateSubtext}>Create one to get started</Text>
            </View>
          ) : (
            breatheLists.map((list) => (
              <TouchableOpacity
                key={list.id}
                style={styles.listItem}
                onPress={() => router.push(`/breathe-list/${list.id}`)}
              >
                <View style={styles.listItemContent}>
                  <View style={styles.listItemHeader}>
                    <Ionicons name="stop-circle" size={20} color="#FF006E" />
                    <Text style={styles.listItemName}>{list.name}</Text>
                    <TouchableOpacity
                      onPress={() => router.push(`/breathe-list/${list.id}`)}
                      style={styles.editButton}
                    >
                      <Ionicons name="pencil" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.listItemApps}>
                    {list.apps.length} {list.apps.length === 1 ? 'app' : 'apps'} selected
                  </Text>
                  {list.apps.length > 0 && (
                    <View style={styles.appIconsContainer}>
                      {list.apps.slice(0, 3).map((app, idx) => (
                        <View key={idx} style={styles.appIconPlaceholder}>
                          <Text style={styles.appIconText}>{app.name.charAt(0)}</Text>
                        </View>
                      ))}
                      {list.apps.length > 3 && (
                        <Text style={styles.moreAppsText}>+{list.apps.length - 3}</Text>
                      )}
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteList(list.id, list.name)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={18} color="#FF3B30" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Time Windows */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={20} color="#fff" style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Active Time Windows</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Set when the breathe interception should be active. Leave empty to always be active.
          </Text>

          {timeWindows.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No time windows set</Text>
              <Text style={styles.emptyStateSubtext}>Active all day</Text>
            </View>
          ) : (
            timeWindows.map((window, index) => (
              <View key={index} style={styles.timeWindowItem}>
                <View style={styles.timeWindowContent}>
                  <Text style={styles.timeWindowText}>
                    {formatTime(window.start)} - {formatTime(window.end)}
                  </Text>
                  {isWithinTimeWindow(window) && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                </View>
                <View style={styles.timeWindowActions}>
                  <TouchableOpacity
                    onPress={() => handleEditTimeWindow(window, index)}
                    style={styles.editTimeButton}
                  >
                    <Ionicons name="pencil" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveTimeWindow(index)}
                    style={styles.deleteTimeButton}
                  >
                    <Ionicons name="trash" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.addTimeWindowButton}
            onPress={handleAddTimeWindow}
          >
            <Ionicons name="add" size={20} color="#00FFB8" />
            <Text style={styles.addTimeWindowText}>Add Time Window</Text>
          </TouchableOpacity>
        </View>

        {/* Block list: one list of apps that trigger breathing */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeader}>
              <Ionicons name="phone-portrait" size={20} color="#fff" style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Apps</Text>
            </View>
            <TouchableOpacity
              style={styles.chooseAppsButton}
              onPress={() => router.push('/choose-apps')}
            >
              <Text style={styles.chooseAppsButtonText}>Add / Remove</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDescription}>
            Only these apps will trigger a breathing moment when you open them. Tap Add / Remove to see all your apps.
          </Text>
          <Text style={styles.appCountText}>
            {selectedApps.length === 0
              ? 'No apps selected'
              : `${selectedApps.length} ${selectedApps.length === 1 ? 'app' : 'apps'} selected`}
          </Text>
          {selectedApps.length > 0 && (
            <View style={styles.appChipsRow}>
              {selectedApps.slice(0, 5).map((app) => (
                <View key={app.id} style={styles.appChip}>
                  <Text style={styles.appChipText}>{app.name}</Text>
                </View>
              ))}
              {selectedApps.length > 5 && (
                <Text style={styles.appChipMore}>+{selectedApps.length - 5}</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Time Window Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTimeWindow ? 'Edit Time Window' : 'Add Time Window'}
            </Text>

            <View style={styles.timeInputContainer}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Start Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="09:00"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>End Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="17:00"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveTimeWindow}
              >
                <LinearGradient
                  colors={['#A8E6CF', '#D4EDF7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalSaveButtonGradient}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create List Modal */}
      <Modal
        visible={showCreateList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateList(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowCreateList(false);
            setNewListName('');
          }}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Breathe List</Text>
            <TextInput
              style={styles.listNameInput}
              value={newListName}
              onChangeText={setNewListName}
              placeholder="Enter list name"
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateList(false);
                  setNewListName('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleCreateList}
              >
                <LinearGradient
                  colors={['#A8E6CF', '#D4EDF7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalSaveButtonGradient}
                >
                  <Text style={styles.modalSaveText}>Create</Text>
                </LinearGradient>
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
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  sectionDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
    marginBottom: 16,
  },
  accessibilityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  accessibilityStatusText: {
    fontSize: 16,
    color: '#00FFB8',
    fontWeight: '600',
  },
  accessibilityStatusTextWarning: {
    fontSize: 16,
    color: '#FFB800',
    fontWeight: '600',
  },
  appPermissionsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 12,
  },
  appPermissionsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  openAccessibilityButton: {
    backgroundColor: 'rgba(0, 255, 184, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 184, 0.4)',
    marginBottom: 12,
  },
  openAccessibilityButtonText: {
    color: '#00FFB8',
    fontSize: 16,
    fontWeight: '600',
  },
  accessibilitySteps: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
  emptyStateSubtext: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  listItemContent: {
    flex: 1,
  },
  listItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  editButton: {
    padding: 4,
  },
  listItemApps: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  appIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIconPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  appIconText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  moreAppsText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 12,
  },
  timeWindowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  timeWindowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeWindowText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  activeBadge: {
    backgroundColor: '#00FFB8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  activeBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  timeWindowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editTimeButton: {
    padding: 8,
    marginRight: 8,
  },
  deleteTimeButton: {
    padding: 8,
  },
  addTimeWindowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 184, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 184, 0.3)',
  },
  addTimeWindowText: {
    color: '#00FFB8',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  chooseAppsButton: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  chooseAppsButtonText: {
    color: '#00D4FF',
    fontSize: 16,
    fontWeight: '600',
  },
  appCountText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
  },
  appChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  appChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  appChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  appChipMore: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  statisticsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  statisticsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  timeInputContainer: {
    marginBottom: 20,
  },
  timeInputGroup: {
    marginBottom: 16,
  },
  timeInputLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  listNameInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalCancelText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
