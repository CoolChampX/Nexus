import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NexusLogo } from '@/components/nexus-logo';
import { ThemedText } from '@/components/themed-text';
import { useAppearance } from '@/lib/appearance';
import { useNotifications } from '@/lib/notifications';
import { animateLayoutTransition, enableLayoutTransitions } from '@/lib/ui-transitions';

const formatRelativeTime = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.round(diffHours / 24)}d ago`;
};

export default function InboxScreen() {
  const { palette } = useAppearance();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const {
    notifications,
    unreadCount,
    refreshNotifications,
    refreshUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    enableLayoutTransitions();
  }, []);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    void Promise.all([refreshUnreadCount(), refreshNotifications()]);
  }, [isFocused, refreshNotifications, refreshUnreadCount]);

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      await Promise.all([refreshUnreadCount(), refreshNotifications()]);
    } finally {
      setRefreshing(false);
    }
  };

  const openNotification = async (notificationId: string, questionId: string) => {
    animateLayoutTransition();
    await markNotificationRead(notificationId);

    router.push({
      pathname: '/questions/[questionId]',
      params: { questionId },
    });
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}>
      <View style={[styles.heroCard, { backgroundColor: palette.hero, paddingTop: Math.max(insets.top + 18, 34) }]}>
        <View style={styles.heroHeader}>
          <NexusLogo inverted flushLeft />
          {unreadCount > 0 ? (
            <Pressable
              onPress={() => {
                animateLayoutTransition();
                void markAllNotificationsRead();
              }}
              style={[styles.markAllButton, { borderColor: palette.border, backgroundColor: palette.card }]}>
              <ThemedText style={[styles.markAllText, { color: palette.text }]}>Mark all read</ThemedText>
            </Pressable>
          ) : null}
        </View>
        <ThemedText style={[styles.heroTitle, { color: palette.heroText || '#111827' }]}>Inbox</ThemedText>
        <ThemedText style={[styles.heroBody, { color: palette.muted }]}>
          {unreadCount > 0
            ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'} waiting for you.`
            : 'You are all caught up for now.'}
        </ThemedText>
      </View>

      {notifications.length ? (
        notifications.map((item) => {
          const unread = !item.readAt;
          const actorName = item.actor?.name?.trim() || item.actor?.email?.trim() || 'Community member';
          const actorInitials = actorName
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          const actorAvatarSource = item.actor?.avatarImageUrl?.trim() || undefined;

          return (
            <Pressable
              key={item._id}
              onPress={() => void openNotification(item._id, item.questionId)}
              style={[
                styles.itemCard,
                {
                  backgroundColor: unread ? palette.card : palette.background,
                  borderColor: unread ? palette.accentSoft : palette.border,
                },
              ]}>
              <View style={styles.itemHeader}>
                <View style={styles.identityRow}>
                  <View
                    style={[
                      styles.avatarShell,
                      { backgroundColor: item.actor?.avatarColor || palette.accent },
                    ]}>
                    {actorAvatarSource ? (
                      <Image source={actorAvatarSource} contentFit="cover" style={styles.avatarImage} />
                    ) : (
                      <ThemedText style={styles.avatarText}>{actorInitials}</ThemedText>
                    )}
                  </View>
                  <View style={styles.itemCopy}>
                    <ThemedText style={[styles.itemTitle, { color: palette.text }]}>{item.title}</ThemedText>
                    <ThemedText style={[styles.itemMeta, { color: palette.muted }]}>
                      {actorName} | {formatRelativeTime(item.createdAt)}
                    </ThemedText>
                  </View>
                </View>
                {unread ? <View style={[styles.unreadDot, { backgroundColor: palette.accent }]} /> : null}
              </View>

              <ThemedText style={[styles.itemBody, { color: palette.text }]}>{item.body}</ThemedText>
              {item.questionTitle ? (
                <View style={[styles.threadPill, { backgroundColor: palette.accentSoft }]}>
                  <MaterialIcons name="forum" size={14} color={palette.accent} />
                  <ThemedText style={[styles.threadPillText, { color: palette.accent }]}>
                    {item.questionTitle}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          );
        })
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No notifications yet</ThemedText>
          <ThemedText style={[styles.emptyBody, { color: palette.muted }]}>
            When someone answers your question, comments on your post, or mentions you, it will show up here.
          </ThemedText>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    borderRadius: 999,
    height: 44,
    width: 44,
  },
  avatarShell: {
    alignItems: 'center',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 32,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 24,
    gap: 10,
    marginLeft: -16,
    paddingBottom: 18,
    paddingLeft: 0,
    paddingRight: 18,
    paddingTop: 18,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  identityRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  itemBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  itemMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  markAllButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '800',
  },
  screen: {
    flex: 1,
  },
  threadPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  threadPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  unreadDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
});
