import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppearance } from '@/lib/appearance';
import { forumApi } from '@/lib/forum-api';

export default function ResetPasswordScreen() {
  const { palette, resolvedScheme } = useAppearance();
  const params = useLocalSearchParams<{ userId?: string; secret?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isDark = resolvedScheme === 'dark';
  const cardBackground = isDark ? 'rgba(24, 22, 38, 0.92)' : 'rgba(255, 255, 255, 0.94)';
  const cardBorder = isDark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(139, 92, 246, 0.14)';
  const subtleText = isDark ? '#C4B5FD' : '#7C6997';
  const inputBackground = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.88)';
  const inputBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(139, 92, 246, 0.12)';

  const submit = async () => {
    if (!params.userId || !params.secret) {
      Alert.alert('Invalid reset link', 'This password reset link is incomplete or expired.');
      return;
    }

    if (password.trim().length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters for your new password.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same new password in both fields.');
      return;
    }

    try {
      setSubmitting(true);
      await forumApi.completePasswordReset({
        userId: String(params.userId),
        secret: String(params.secret),
        password,
      });

      Alert.alert('Password updated', 'Your password has been reset. You can log in now.', [
        {
          text: 'Go to login',
          onPress: () => router.replace('/auth'),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Could not reset password',
        error instanceof Error ? error.message : 'Unknown reset error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: isDark ? '#120F21' : '#F4EDF7' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: cardBackground, borderColor: cardBorder }]}>
          <ThemedText style={[styles.title, { color: palette.text }]}>Reset password</ThemedText>
          <ThemedText style={[styles.subtitle, { color: subtleText }]}>
            Choose a new password for your account.
          </ThemedText>

          <View style={[styles.inputShell, { backgroundColor: inputBackground, borderColor: inputBorder }]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="new password"
              placeholderTextColor={subtleText}
              style={[styles.inputField, { color: palette.text }]}
            />
          </View>

          <View style={[styles.inputShell, { backgroundColor: inputBackground, borderColor: inputBorder }]}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="confirm new password"
              placeholderTextColor={subtleText}
              style={[styles.inputField, { color: palette.text }]}
            />
          </View>

          <Pressable onPress={() => void submit()} style={[styles.primaryButton, { backgroundColor: palette.accent }]}>
            <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>
              {submitting ? 'Updating...' : 'Update password'}
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
  inputShell: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    marginTop: 16,
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  screen: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
});
