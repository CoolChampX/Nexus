import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { useAppearance } from '@/lib/appearance';
import { forumApi, type AdminUser } from '@/lib/forum-api';

const formatJoinedDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));

export default function AdminScreen() {
  const { ready, refreshProfile, user } = useAuth();
  const { palette } = useAppearance();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(
    async (nextQuery = query, isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await forumApi.listAdminUsers(nextQuery);
        setUsers(response);
      } catch (error) {
        Alert.alert('Could not load users', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [query]
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!user) {
      router.replace('/auth');
      return;
    }

    if (!user.canManageAdmins) {
      router.replace('/profile');
      return;
    }

    void loadUsers('');
  }, [loadUsers, ready, user]);

  const handleSearch = async () => {
    const nextQuery = searchDraft.trim();
    setQuery(nextQuery);
    await loadUsers(nextQuery);
  };

  const replaceUpdatedUser = useCallback((updatedUser: AdminUser) => {
    setUsers((current) =>
      current.map((currentUser) =>
        currentUser.userId === updatedUser.userId ? updatedUser : currentUser
      )
    );
  }, []);

  const toggleRole = async (entry: AdminUser) => {
    if (entry.canManageAdmins) {
      Alert.alert('Primary admin', 'This user is a main admin and should stay managed through the primary admin list.');
      return;
    }

    const nextRole = entry.role === 'admin' ? 'user' : 'admin';
    const actionLabel = nextRole === 'admin' ? 'promote to admin' : 'remove admin access';

    Alert.alert(
      nextRole === 'admin' ? 'Promote user' : 'Remove admin',
      `Are you sure you want to ${actionLabel} for ${entry.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextRole === 'admin' ? 'Promote' : 'Remove',
          onPress: () => {
            void (async () => {
              try {
                setUpdatingUserId(entry.userId);
                const response = await forumApi.updateUserRole(entry.userId, nextRole);
                replaceUpdatedUser(response.user);

                if (user?.id === entry.userId) {
                  await refreshProfile();
                }
              } catch (error) {
                Alert.alert(
                  'Could not update role',
                  error instanceof Error ? error.message : 'Unknown error'
                );
              } finally {
                setUpdatingUserId(null);
              }
            })();
          },
        },
      ]
    );
  };

  const toggleDisabledState = async (entry: AdminUser) => {
    const nextDisabledState = !entry.isDisabled;
    const title = nextDisabledState ? 'Disable account' : 'Enable account';
    const actionLabel = nextDisabledState ? 'disable' : 'enable';

    Alert.alert(
      title,
      `Are you sure you want to ${actionLabel} ${entry.email}?${nextDisabledState ? ' This will sign them out of the app.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextDisabledState ? 'Disable' : 'Enable',
          style: nextDisabledState ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              try {
                setUpdatingUserId(entry.userId);
                const response = await forumApi.updateUserDisabledState(entry.userId, nextDisabledState);
                replaceUpdatedUser(response.user);
              } catch (error) {
                Alert.alert(
                  'Could not update account',
                  error instanceof Error ? error.message : 'Unknown error'
                );
              } finally {
                setUpdatingUserId(null);
              }
            })();
          },
        },
      ]
    );
  };

  const filteredSummary = useMemo(() => {
    if (!query) {
      return 'Showing the latest users in the system.';
    }

    return `Showing results for "${query}".`;
  }, [query]);

  if (!ready || !user?.canManageAdmins) {
    return <View style={[styles.screen, { backgroundColor: palette.background }]} />;
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadUsers(query, true)} />}>
      <View style={[styles.heroCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <ThemedText style={[styles.heroTitle, { color: palette.text }]}>User management</ThemedText>
        <ThemedText style={[styles.heroBody, { color: palette.muted }]}>
          Primary admins can search users, manage admin access, and disable user accounts from inside the app.
        </ThemedText>
      </View>

      <View style={[styles.searchCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={[styles.searchField, { backgroundColor: palette.background, borderColor: palette.border }]}>
          <MaterialIcons name="search" size={20} color={palette.muted} />
          <TextInput
            value={searchDraft}
            onChangeText={setSearchDraft}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Search by name, email, or user id"
            placeholderTextColor={palette.muted}
            style={[styles.searchInput, { color: palette.text }]}
            returnKeyType="search"
            onSubmitEditing={() => void handleSearch()}
          />
        </View>
        <Pressable onPress={() => void handleSearch()} style={[styles.searchButton, { backgroundColor: palette.accent }]}>
          <ThemedText style={[styles.searchButtonText, { color: palette.textOnAccent }]}>Search</ThemedText>
        </Pressable>
        <ThemedText style={[styles.searchSummary, { color: palette.muted }]}>{filteredSummary}</ThemedText>
      </View>

      {loading ? (
        <View style={[styles.loadingCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ActivityIndicator color={palette.accent} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>Loading users...</ThemedText>
        </View>
      ) : users.length ? (
        <View style={styles.list}>
          {users.map((entry) => {
            const isUpdating = updatingUserId === entry.userId;
            const isPrimaryAdmin = entry.canManageAdmins;
            const effectiveAdmin = entry.effectiveRole === 'admin';
            const isDisabled = entry.isDisabled;

            return (
              <View key={entry.userId} style={[styles.userCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <View style={styles.userHeader}>
                  <View style={styles.userCopy}>
                    <ThemedText style={[styles.userName, { color: palette.text }]}>{entry.name}</ThemedText>
                    <ThemedText style={[styles.userEmail, { color: palette.muted }]}>{entry.email}</ThemedText>
                    <ThemedText style={[styles.userMeta, { color: palette.muted }]}>
                      {entry.userId} | joined {formatJoinedDate(entry.joinedAt)}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.rolePill,
                      { backgroundColor: isDisabled ? '#FEE2E2' : effectiveAdmin ? '#FEF3C7' : palette.accentSoft },
                    ]}>
                    <ThemedText
                      style={[
                        styles.rolePillText,
                        { color: isDisabled ? '#B91C1C' : effectiveAdmin ? '#92400E' : palette.accent },
                      ]}>
                      {isDisabled ? 'Disabled' : effectiveAdmin ? 'Admin' : 'User'}
                    </ThemedText>
                  </View>
                </View>

                {isPrimaryAdmin ? (
                  <ThemedText style={[styles.primaryAdminHint, { color: palette.accent }]}>
                    Main admin account. This user can manage all users from inside the application.
                  </ThemedText>
                ) : isDisabled ? (
                  <ThemedText style={styles.disabledHint}>
                    This account is disabled and cannot sign in until it is enabled again.
                  </ThemedText>
                ) : null}

                <View style={styles.actionsRow}>
                  <Pressable
                    disabled={isUpdating}
                    onPress={() => void toggleRole(entry)}
                    style={[
                      styles.actionButton,
                      styles.halfActionButton,
                      {
                        backgroundColor: effectiveAdmin ? palette.background : palette.accent,
                        borderColor: palette.border,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.actionButtonText,
                        { color: effectiveAdmin ? palette.text : palette.textOnAccent },
                      ]}>
                      {isUpdating
                        ? 'Updating...'
                        : effectiveAdmin
                          ? 'Remove admin'
                          : 'Make admin'}
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    disabled={isUpdating || isPrimaryAdmin}
                    onPress={() => void toggleDisabledState(entry)}
                    style={[
                      styles.actionButton,
                      styles.halfActionButton,
                      {
                        backgroundColor: isDisabled ? palette.accent : palette.background,
                        borderColor: isDisabled ? palette.accent : palette.border,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.actionButtonText,
                        { color: isDisabled ? palette.textOnAccent : '#B91C1C' },
                      ]}>
                      {isUpdating ? 'Updating...' : isDisabled ? 'Enable account' : 'Disable account'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No users found</ThemedText>
          <ThemedText style={[styles.emptyBody, { color: palette.muted }]}>
            Try a different name, email, or user id.
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 32,
  },
  disabledHint: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 10,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  halfActionButton: {
    flex: 1,
  },
  list: {
    gap: 12,
  },
  loadingCard: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
  },
  primaryAdminHint: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 10,
  },
  rolePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  screen: {
    flex: 1,
  },
  searchButton: {
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  searchCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  searchField: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    minWidth: 0,
  },
  searchSummary: {
    fontSize: 13,
  },
  userCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  userCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  userEmail: {
    fontSize: 14,
  },
  userHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  userMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
});
