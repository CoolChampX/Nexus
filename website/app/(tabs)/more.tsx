import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NexusLogo } from '@/components/nexus-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth';
import { useAppearance } from '@/lib/appearance';
import { forumApi } from '@/lib/forum-api';

const appwriteCallbackScheme =
  (Constants.expoConfig?.scheme as string | undefined) || 'appwrite-callback-69e5cba40023fbdf246f';
const isExpoGo = Constants.executionEnvironment === 'storeClient';

const buildPasswordResetUrl = () => {
  const configuredResetBaseUrl = process.env.EXPO_PUBLIC_RESET_BASE_URL?.trim();
  const appRedirectUrl = isExpoGo
    ? Linking.createURL('reset-password')
    : `${appwriteCallbackScheme}://localhost/reset-password`;

  const resetBaseUrl = configuredResetBaseUrl || forumApi.apiBaseUrl;

  return `${resetBaseUrl.replace(/\/$/, '')}/api/auth/password-reset/redirect?redirect=${encodeURIComponent(
    appRedirectUrl
  )}`;
};

export default function MoreScreen() {
  const { logout, user } = useAuth();
  const { mode, resolvedScheme, palette } = useAppearance();
  const insets = useSafeAreaInsets();
  const isAdmin = user?.role === 'admin';
  const canManageAdmins = Boolean(user?.canManageAdmins);
  const [fixedTopBarHeight, setFixedTopBarHeight] = useState(0);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const topBarPadding = Math.max(insets.top + 18, 34);
  const contentBottomPadding = Math.max(insets.bottom, 10) + 124;

  const handlePasswordReset = async () => {
    if (!user?.email?.trim()) {
      Alert.alert('Could not continue', 'No email address is available for this account.');
      return;
    }

    try {
      setSendingPasswordReset(true);
      await forumApi.requestPasswordReset({
        email: user.email.trim(),
        callbackUrl: buildPasswordResetUrl(),
      });
      Alert.alert(
        'Reset email sent',
        `We emailed a password reset link to ${user.email.trim()}. Open it on this device to choose a new password.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send the password reset email';
      const resetBaseUrl = process.env.EXPO_PUBLIC_RESET_BASE_URL?.trim();
      const resetBaseHost = resetBaseUrl
        ? (() => {
            try {
              return new URL(resetBaseUrl).host;
            } catch {
              return resetBaseUrl;
            }
          })()
        : null;

      Alert.alert(
        'Could not continue',
        /invalid url param|register your new client|web platform/i.test(message)
          ? `Password reset needs your reset callback host registered in Appwrite as a Web platform.${resetBaseHost ? ` Add ${resetBaseHost} in Appwrite Console -> Project -> Platforms, then try again.` : ' Add your public reset URL host in Appwrite Console -> Project -> Platforms, then try again.'}`
          : message
      );
    } finally {
      setSendingPasswordReset(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View
        onLayout={({ nativeEvent }) => {
          const nextHeight = Math.ceil(nativeEvent.layout.height);
          setFixedTopBarHeight((current) => (current === nextHeight ? current : nextHeight));
        }}
        style={[styles.fixedTopBarShell, { backgroundColor: palette.hero }]}>
        <View style={[styles.topBarContent, { paddingTop: topBarPadding }]}>
          <NexusLogo inverted flushLeft />
        </View>
      </View>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: fixedTopBarHeight + 12, paddingBottom: contentBottomPadding },
        ]}>
        <View style={[styles.heroSection, { backgroundColor: palette.hero }]}>
          <View style={styles.identityRow}>
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
          <Pressable
            disabled={sendingPasswordReset}
            onPress={() => void handlePasswordReset()}
            style={[styles.linkButton, { borderColor: palette.border }]}>
            <ThemedText style={[styles.linkText, { color: palette.text }]}>
              {sendingPasswordReset ? 'Sending reset email...' : 'Change password'}
            </ThemedText>
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
    </View>
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
  fixedTopBarShell: {
    left: 0,
    paddingBottom: 14,
    paddingRight: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  heroSection: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 4,
    marginBottom: 4,
    paddingBottom: 18,
    paddingLeft: 0,
    paddingRight: 18,
    paddingTop: 12,
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
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
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '800',
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
  topBarContent: {
    paddingLeft: 0,
  },
});
