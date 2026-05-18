import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NexusLogo } from '@/components/nexus-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth';
import { useAppearance } from '@/lib/appearance';

export default function MoreScreen() {
  const { logout, user } = useAuth();
  const { mode, resolvedScheme, palette } = useAppearance();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === 'admin';
  const canManageAdmins = Boolean(user?.canManageAdmins);

  return (
    <ScrollView style={[styles.screen, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.heroCard, { backgroundColor: palette.hero, paddingTop: Math.max(insets.top + 18, 34) }]}>
        <NexusLogo inverted flushLeft />
        <ThemedText
          style={[
            styles.subtitle,
            { color: resolvedScheme === 'dark' ? '#CBD5E1' : palette.muted },
          ]}>
          Signed in as {user?.name ?? 'Developer'}.
        </ThemedText>
        <ThemedText
          style={[
            styles.roleBadge,
            {
              backgroundColor: isAdmin ? 'rgba(250, 204, 21, 0.18)' : palette.accentSoft,
              color: isAdmin ? '#FDE68A' : palette.accent,
            },
          ]}>
          {isAdmin ? 'Logged in as admin' : 'Logged in as user'}
        </ThemedText>
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBadge, { backgroundColor: palette.accentSoft }]}>
            <IconSymbol
              name={resolvedScheme === 'dark' ? 'moon.stars.fill' : 'sun.max.fill'}
              size={18}
              color={palette.accent}
            />
          </View>
          <View style={styles.copy}>
            <ThemedText style={[styles.rowTitle, { color: palette.text }]}>Theme</ThemedText>
            <ThemedText style={[styles.rowBody, { color: palette.muted }]}>
              Current mode: {mode === 'system' ? `System (${resolvedScheme})` : mode}
            </ThemedText>
          </View>
        </View>
        <ThemeToggle />
      </View>

      <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBadge, { backgroundColor: palette.accentSoft }]}>
            <IconSymbol name="gearshape.fill" size={18} color={palette.accent} />
          </View>
          <View style={styles.copy}>
            <ThemedText style={[styles.rowTitle, { color: palette.text }]}>Quick links</ThemedText>
            <ThemedText style={[styles.rowBody, { color: palette.muted }]}>
              Jump to your editable profile or create a new post.
            </ThemedText>
          </View>
        </View>

        <Pressable onPress={() => router.push('/edit-profile')} style={[styles.linkButton, { borderColor: palette.border }]}>
          <ThemedText style={[styles.linkText, { color: palette.text }]}>Edit profile</ThemedText>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/explore')} style={[styles.linkButton, { borderColor: palette.border }]}>
          <ThemedText style={[styles.linkText, { color: palette.text }]}>Ask a question</ThemedText>
        </Pressable>
        {canManageAdmins ? (
          <Pressable onPress={() => router.push('/admin')} style={[styles.linkButton, { borderColor: palette.border }]}>
            <ThemedText style={[styles.linkText, { color: palette.text }]}>Manage users</ThemedText>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          logout();
          router.replace('/auth');
        }}
        style={[styles.logoutButton, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <ThemedText style={[styles.logoutText, { color: palette.text }]}>Sign out</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 32,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  heroCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 24,
    gap: 4,
    marginLeft: -16,
    paddingBottom: 18,
    paddingLeft: 0,
    paddingRight: 18,
    paddingTop: 18,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  linkButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 15,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '800',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  rowBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  screen: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
});
