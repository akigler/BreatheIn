import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBreatheSettingsStore } from '../store/breatheSettingsStore';
import { AppInfo } from '../types/breatheSettings';
import { appInterceptionService } from '../services/appInterceptionService';

// App categories matching Opal's structure
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

export default function ChooseAppsScreen() {
  const router = useRouter();
  const { selectedApps, setSelectedApps } = useBreatheSettingsStore();
  const [installedApps, setInstalledApps] = useState<AppInfo[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(
    new Set(selectedApps.map(app => app.id))
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInstalledApps();
    // Load selected apps from store
    setSelectedAppIds(new Set(selectedApps.map(app => app.id)));
  }, []);

  const loadInstalledApps = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch real installed apps from the phone
      const apps = await appInterceptionService.getInstalledApps();
      setInstalledApps(apps);
    } catch (err) {
      console.error('Error loading installed apps:', err);
      setError('Failed to load apps. Please check permissions.');
      // Fallback to empty array
      setInstalledApps([]);
    } finally {
      setLoading(false);
    }
  };

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
    if (selectedAppIds.size === installedApps.length) {
      setSelectedAppIds(new Set());
    } else {
      setSelectedAppIds(new Set(installedApps.map(app => app.id)));
    }
  };

  const handleSave = async () => {
    const appsToSave = installedApps.filter(app => selectedAppIds.has(app.id));
    await setSelectedApps(appsToSave);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const getCategoryApps = (categoryId: string) => {
    if (categoryId === 'all') {
      return installedApps;
    }
    return installedApps.filter(app => app.category === categoryId);
  };

  const getCategoryAppCount = (categoryId: string) => {
    const categoryApps = getCategoryApps(categoryId);
    return categoryApps.filter(app => selectedAppIds.has(app.id)).length;
  };

  const filteredApps = filterCategory
    ? getCategoryApps(filterCategory)
    : installedApps;

  const selectedCount = selectedAppIds.size;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Activities</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4FF" />
          <Text style={styles.loadingText}>Loading apps from your phone...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Activities</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadInstalledApps}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
                  selectedAppIds.size === installedApps.length && styles.checkboxSelected,
                ]}
              >
                {selectedAppIds.size === installedApps.length && (
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#00D4FF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
