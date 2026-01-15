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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBreatheSettingsStore } from '../store/breatheSettingsStore';
import { BreatheList, TimeWindow } from '../types/breatheSettings';

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

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggle = async () => {
    await toggle();
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Breathe Settings</Text>
          <View style={styles.placeholder} />
        </View>

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

        {/* Selected Apps Summary */}
        {selectedApps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selected Apps</Text>
            <Text style={styles.sectionDescription}>
              {selectedApps.length} {selectedApps.length === 1 ? 'app' : 'apps'} selected
            </Text>
            <TouchableOpacity
              style={styles.chooseAppsButton}
              onPress={() => router.push('/(tabs)/choose-apps')}
            >
              <Text style={styles.chooseAppsButtonText}>Add / Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Time Window Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
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
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create List Modal */}
      <Modal
        visible={showCreateList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateList(false)}
      >
        <View style={styles.modalOverlay}>
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
                <Text style={styles.modalSaveText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    backgroundColor: '#00FFB8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  modalSaveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
