import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useEffect, useMemo } from 'react';

import { SessionRefreshOverlay } from '@/components/session-refresh-overlay';
import { AuthProvider, useAuth } from '@/lib/auth';
import { preloadAiExplainerHistoryEntries } from '@/lib/ai-explainer-history';
import { NotificationsProvider } from '@/lib/notifications';
import { AppearanceProvider, useAppearance } from '@/lib/appearance';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <AuthProvider>
        <NotificationsProvider>
          <ThemeRoot />
        </NotificationsProvider>
      </AuthProvider>
    </AppearanceProvider>
  );
}

function ThemeRoot() {
  const { palette, resolvedScheme } = useAppearance();
  const { isRefreshingSession, ready, user } = useAuth();
  const navigationTheme = useMemo(() => {
    const baseTheme = resolvedScheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: palette.background,
        card: palette.cardAlt,
        border: palette.border,
        primary: palette.accent,
        text: palette.text,
        notification: palette.accent,
      },
    };
  }, [palette.accent, palette.background, palette.border, palette.cardAlt, palette.text, resolvedScheme]);

  useEffect(() => {
    void preloadAiExplainerHistoryEntries();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navigationTheme}>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: palette.background },
              animationDuration: 280,
            }}>
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen
              name="reset-password"
              options={{
                title: 'Reset Password',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: palette.cardAlt },
                headerTintColor: palette.text,
                headerTitleStyle: { color: palette.text },
                contentStyle: { backgroundColor: palette.background },
              }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="profile"
              options={{
                title: 'Profile',
                animation: 'slide_from_right',
                animationDuration: 280,
                fullScreenGestureEnabled: true,
                gestureEnabled: true,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: palette.cardAlt },
                headerTintColor: palette.text,
                headerTitleStyle: { color: palette.text },
                contentStyle: { backgroundColor: palette.background },
              }}
            />
            <Stack.Screen
              name="questions/[questionId]"
              options={{
                title: 'Thread',
                headerBackTitle: 'Feed',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: palette.cardAlt },
                headerTintColor: palette.text,
                headerTitleStyle: { color: palette.text },
                contentStyle: { backgroundColor: palette.background },
              }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                title: 'Modal',
                headerStyle: { backgroundColor: palette.cardAlt },
                headerTintColor: palette.text,
                headerTitleStyle: { color: palette.text },
                contentStyle: { backgroundColor: palette.background },
              }}
            />
            <Stack.Screen
              name="edit-profile"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                animationDuration: 280,
                gestureEnabled: true,
                title: 'Edit Profile',
                headerStyle: { backgroundColor: palette.card },
                headerTintColor: palette.text,
                headerTitleStyle: { color: palette.text },
                contentStyle: { backgroundColor: palette.background },
              }}
            />
            <Stack.Screen
              name="ai-history"
              options={{
                title: 'AI Explainer History',
                headerShadowVisible: false,
                headerStyle: { backgroundColor: palette.cardAlt },
                headerTintColor: palette.text,
                headerTitleStyle: { color: palette.text },
                contentStyle: { backgroundColor: palette.background },
              }}
            />
            <Stack.Screen
              name="admin"
              options={{
                title: 'Admin Panel',
                animation: 'slide_from_right',
                animationDuration: 280,
                fullScreenGestureEnabled: true,
                gestureEnabled: true,
                headerShadowVisible: false,
                headerStyle: { backgroundColor: palette.cardAlt },
                headerTintColor: palette.text,
                headerTitleStyle: { color: palette.text },
                contentStyle: { backgroundColor: palette.background },
              }}
            />
          </Stack>
          {!ready || (isRefreshingSession && !!user) ? <SessionRefreshOverlay /> : null}
        </View>
        <StatusBar
          style={resolvedScheme === 'dark' ? 'light' : 'dark'}
          backgroundColor={palette.background}
          translucent={false}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
