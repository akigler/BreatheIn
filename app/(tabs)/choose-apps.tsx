import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBreatheSettingsStore } from '../../store/breatheSettingsStore';
import { AppInfo } from '../../types/breatheSettings';

// Mock app categories and apps - in production, this would come from native module
const APP_CATEGORIES = [
  {
    id: 'all',
    name: 'All Apps & Categories',
    icon: 'grid',
    color: '#00D4FF',
  },
  {
    id: 'social',
    name: 'Social',
    icon: 'chatbubbles',
    color: '#FF006E',
  },
  {
    id: 'games',
    name: 'Games',
    icon: 'game-controller',
    color: '#00D4FF',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'film',
    color: '#FF3B30',
  },
  {
    id: 'productivity',
    name: 'Productivity & Finance',
    icon: 'briefcase',
    color: '#00D4FF',
  },
  {
    id: 'shopping',
    name: 'Shopping & Food',
    icon: 'bag',
    color: '#00D4FF',
  },
];

// Mock apps - in production, get from native module
const MOCK_APPS: AppInfo[] = [
  { id: 'com.twitter', name: 'X (Twitter)', category: 'social' },
  { id: 'com.reddit', name: 'Reddit', category: 'social' },
  { id: 'com.instagram', name: 'Instagram', category: 'social' },
  { id: 'com.facebook', name: 'Facebook', category: 'social' },
  { id: 'com.linkedin', name: 'LinkedIn', category: 'social' },
  { id: 'com.discord', name: 'Discord', category: 'social' },
  { id: 'com.tiktok', name: 'TikTok', category: 'entertainment' },
  { id: 'com.youtube', name: 'YouTube', category: 'entertainment' },
  { id: 'com.netflix', name: 'Netflix', category: 'entertainment' },
  { id: 'com.spotify', name: 'Spotify', category: 'entertainment' },
  { id: 'com.amazon', name: 'Amazon', category: 'shopping' },
  { id: 'com.uber', name: 'Uber', category: 'shopping' },
  { id: 'com.doordash', name: 'DoorDash', category: 'shopping' },
];

export default function ChooseAppsScreen() {
  const router = useRouter();
  const { selectedApps, setSelectedApps } = useBreatheSettingsStore();
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(
    new Set(selectedApps.map(app => app.id))
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  useEffect(() => {
    // Load selected apps from store
    setSelectedAppIds(new Set(selectedApps.map(app => app.id)));
  }, []);

  const toggleAppSelection = (app: AppInfo) => {
    const newSelected = new Set(selectedAppIds);
    if (newSelected.has(app.id)) {
      newSelected.delete(app.id);
    } else {
      newSelected.add(app.id);
    }
    setSelectedAppIds(newSelected);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSelectAll = () => {
    if (selectedAppIds.size === MOCK_APPS.length) {
      setSelectedAppIds(new Set());
    } else {
      setSelectedAppIds(new Set(MOCK_APPS.map(app => app.id)));
    }
  };

  const handleSave = async () => {
    const appsToSave = MOCK_APPS.filter(app => selectedAppIds.has(app.id));
    await setSelectedApps(appsToSave);
    // Navigate to home tab if we can go back, otherwise stay on this tab
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/');
    }
  };

  const handleCancel = () => {
    // Navigate to home tab if we can go back, otherwise stay on this tab
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(tabs)/');
    }
  };

  const getCategoryApps = (categoryId: string) => {
    if (categoryId === 'all') {
      return MOCK_APPS;
    }
    return MOCK_APPS.filter(app => app.category === categoryId);
  };

  const getCategoryAppCount = (categoryId: string) => {
    const categoryApps = getCategoryApps(categoryId);
    return categoryApps.filter(app => selectedAppIds.has(app.id)).length;
  };

  const filteredApps = filterCategory
    ? getCategoryApps(filterCategory)
    : MOCK_APPS;

  const selectedCount = selectedAppIds.size;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Activities</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.instruction}>
        SELECT APPS/WEBSITES, TAP ">" TO EXPAND
      </Text>

      <ScrollView style={styles.scrollView}>
        {/* Categories */}
        <View style={styles.section}>
          {APP_CATEGORIES.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const categoryApps = getCategoryApps(category.id);
            const selectedInCategory = getCategoryAppCount(category.id);

            return (
              <View key={category.id}>
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => toggleCategory(category.id)}
                >
                  <View style={styles.categoryLeft}>
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: `${category.color}20` },
                      ]}
                    >
                      <Ionicons
                        name={category.icon as any}
                        size={20}
                        color={category.color}
                      />
                    </View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {selectedInCategory > 0 && (
                      <Text style={styles.categoryCount}>{selectedInCategory}</Text>
                    )}
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={20}
                    color="rgba(255, 255, 255, 0.6)"
                  />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.categoryAppsContainer}>
                    {categoryApps.map((app) => {
                      const isSelected = selectedAppIds.has(app.id);
                      return (
                        <TouchableOpacity
                          key={app.id}
                          style={styles.appItem}
                          onPress={() => toggleAppSelection(app)}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              isSelected && styles.checkboxSelected,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            )}
                          </View>
                          <View style={styles.appIconPlaceholder}>
                            <Text style={styles.appIconText}>
                              {app.name.charAt(0)}
                            </Text>
                          </View>
                          <Text style={styles.appName}>{app.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* All Apps List (when no category filter) */}
        {!filterCategory && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAll}
            >
              <View
                style={[
                  styles.checkbox,
                  selectedAppIds.size === MOCK_APPS.length && styles.checkboxSelected,
                ]}
              >
                {selectedAppIds.size === MOCK_APPS.length && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.selectAllText}>Select All</Text>
            </TouchableOpacity>

            {filteredApps.map((app) => {
              const isSelected = selectedAppIds.has(app.id);
              return (
                <TouchableOpacity
                  key={app.id}
                  style={styles.appItem}
                  onPress={() => toggleAppSelection(app)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <View style={styles.appIconPlaceholder}>
                    <Text style={styles.appIconText}>{app.name.charAt(0)}</Text>
                  </View>
                  <Text style={styles.appName}>{app.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.selectedCount}>
          {selectedCount} {selectedCount === 1 ? 'APP' : 'APPS'} SELECTED
        </Text>
        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
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
  instruction: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 20,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    flex: 1,
  },
  categoryCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginLeft: 8,
  },
  categoryAppsContainer: {
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxSelected: {
    backgroundColor: '#00D4FF',
    borderColor: '#00D4FF',
  },
  appIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appIconText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appName: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  footer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
