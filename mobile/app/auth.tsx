import { router } from 'expo-router';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NexusLogo } from '@/components/nexus-logo';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { useAppearance } from '@/lib/appearance';
import { forumApi, type SocialProvider } from '@/lib/forum-api';
import { animateLayoutTransition, enableLayoutTransitions } from '@/lib/ui-transitions';

type AuthMode = 'login' | 'register';

WebBrowser.maybeCompleteAuthSession();

const appwriteCallbackScheme =
  (Constants.expoConfig?.scheme as string | undefined) || 'appwrite-callback-69e5cba40023fbdf246f';
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const LOGIN_LOADING_MESSAGES = [
  'Logging into future visuals...',
  'Syncing your threads and signals...',
  'Opening your dev universe...',
];
const REGISTER_LOADING_MESSAGES = [
  'Building your Nexus identity...',
  'Configuring your future visuals...',
  'Opening your first launch sequence...',
];

const buildCallbackUrl = (flow: 'magic' | 'oauth', provider?: SocialProvider) => {
  const queryParams = {
    flow,
    ...(provider ? { provider } : {}),
  };

  if (isExpoGo) {
    // Expo Go can round-trip through the dev server URL, while custom schemes
    // only work reliably in development builds or standalone apps.
    return Linking.createURL('auth', { queryParams });
  }

  const query = new URLSearchParams();
  query.set('flow', flow);

  if (provider) {
    query.set('provider', provider);
  }

  return `${appwriteCallbackScheme}://localhost/auth?${query.toString()}`;
};

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

export default function AuthScreen() {
  const { login, loginWithMagicLink, loginWithOAuth, ready, register, user } = useAuth();
  const { palette, resolvedScheme } = useAppearance();
  const insets = useSafeAreaInsets();
  const pendingOAuthProviderRef = useRef<SocialProvider | null>(null);
  const processedAuthResultRef = useRef<Set<string>>(new Set());
  const cardFloat = useRef(new Animated.Value(0)).current;
  const cardFlip = useRef(new Animated.Value(0)).current;
  const authOverlayOpacity = useRef(new Animated.Value(0)).current;
  const authOverlayScale = useRef(new Animated.Value(0.96)).current;
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authLoadingMessage, setAuthLoadingMessage] = useState('Logging into future visuals...');
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [magicLinkEmailSent, setMagicLinkEmailSent] = useState('');
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);
  const heroTopPadding = Math.max(insets.top + 14, 28);
  const isDark = resolvedScheme === 'dark';
  const shellBackground = isDark ? '#120F21' : '#F4EDF7';
  const cardBackground = isDark ? 'rgba(24, 22, 38, 0.92)' : 'rgba(255, 255, 255, 0.88)';
  const cardBorder = isDark ? 'rgba(167, 139, 250, 0.18)' : 'rgba(139, 92, 246, 0.14)';
  const cardShadow = isDark ? '#05070D' : '#B8A2D9';
  const pillBackground = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.82)';
  const pillBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.92)';
  const subtleText = isDark ? '#C4B5FD' : '#7C6997';
  const faintAccent = isDark ? 'rgba(167, 139, 250, 0.22)' : 'rgba(139, 92, 246, 0.1)';
  const socialPillBackground = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(139, 92, 246, 0.08)';
  const primaryButtonLabel = mode === 'login' ? 'Enter Nexus' : 'Create account';
  const cardLift = cardFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [4, -14],
  });
  const cardGlowOpacity = cardFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0.16, 0.38],
  });
  const cardScale = cardFloat.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.992, 1, 1.012],
  });
  const glossDrift = cardFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 10],
  });
  const flipRotateY = cardFlip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-360deg', '0deg', '360deg'],
  });
  const cardTiltX = cardFlip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['10deg', '0deg', '10deg'],
  });
  const cardTiltY = cardFlip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-34deg', '0deg', '-34deg'],
  });
  const flipRotateZ = cardFlip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-12deg', '0deg', '12deg'],
  });
  const flipOpacity = cardFlip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.9, 1, 0.9],
  });
  const flipTranslateX = cardFlip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-28, 0, 28],
  });
  const flipTranslateY = cardFlip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [8, 0, 8],
  });
  const flipScale = cardFlip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.94, 1, 0.94],
  });
  const authLoadingMessages = mode === 'login' ? LOGIN_LOADING_MESSAGES : REGISTER_LOADING_MESSAGES;
  const isBusy = authSubmitting || socialLoading !== null || magicLinkLoading;

  useEffect(() => {
    enableLayoutTransitions();
  }, []);

  useEffect(() => {
    if (ready && user) {
      router.replace('/(tabs)');
    }
  }, [ready, user]);

  useEffect(() => {
    if (!authSubmitting) {
      setAuthLoadingMessage(authLoadingMessages[0]);
      authOverlayOpacity.setValue(0);
      authOverlayScale.setValue(0.96);
      return;
    }

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % authLoadingMessages.length;
      setAuthLoadingMessage(authLoadingMessages[messageIndex]);
    }, 1400);

    Animated.parallel([
      Animated.timing(authOverlayOpacity, {
        duration: 220,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(authOverlayScale, {
        damping: 16,
        mass: 0.9,
        stiffness: 170,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      clearInterval(interval);
    };
  }, [authLoadingMessages, authOverlayOpacity, authOverlayScale, authSubmitting]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat, {
          duration: 3200,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(cardFloat, {
          duration: 3200,
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [cardFloat]);

  const toggleMode = () => {
    if (isSwitchingMode || isBusy) {
      return;
    }

    const nextMode: AuthMode = mode === 'login' ? 'register' : 'login';
    setIsSwitchingMode(true);

    Animated.timing(cardFlip, {
      duration: 700,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      toValue: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        setIsSwitchingMode(false);
        return;
      }

      animateLayoutTransition();
      setMode(nextMode);
      cardFlip.setValue(-1);

      Animated.spring(cardFlip, {
        damping: 20,
        mass: 0.9,
        stiffness: 110,
        toValue: 0,
        useNativeDriver: true,
      }).start(() => {
        setIsSwitchingMode(false);
      });
    });
  };

  const completeAuthFromUrl = async (url: string | null) => {
    if (!url) {
      return;
    }

    const { queryParams } = Linking.parse(url);
    const flow = typeof queryParams?.flow === 'string' ? queryParams.flow : null;
    const provider =
      queryParams?.provider === 'github' ? queryParams.provider : pendingOAuthProviderRef.current;
    const isOAuthCallback = flow === 'oauth' || pendingOAuthProviderRef.current !== null;

    if (!queryParams?.userId || !queryParams?.secret) {
      return;
    }

    const authKey = `${isOAuthCallback ? 'oauth' : 'magic'}:${String(queryParams.userId)}:${String(
      queryParams.secret
    )}`;

    if (processedAuthResultRef.current.has(authKey)) {
      return;
    }

    processedAuthResultRef.current.add(authKey);
    setAuthSubmitting(true);

    try {
      if (isOAuthCallback && provider) {
        await loginWithOAuth({
          provider,
          userId: String(queryParams.userId),
          secret: String(queryParams.secret),
        });
      } else {
        await loginWithMagicLink({
          userId: String(queryParams.userId),
          secret: String(queryParams.secret),
        });
      }

      pendingOAuthProviderRef.current = null;
    } catch (error) {
      processedAuthResultRef.current.delete(authKey);
      setAuthSubmitting(false);
      Alert.alert(
        'Could not continue',
        error instanceof Error ? error.message : 'Could not complete sign-in'
      );
    } finally {
      setSocialLoading(null);
    }
  };

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      void completeAuthFromUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void completeAuthFromUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, [loginWithMagicLink, loginWithOAuth]);

  const submit = async () => {
    try {
      setAuthSubmitting(true);

      if (mode === 'login') {
        await login({ email, password });
      } else {
        if (!name.trim()) {
          throw new Error('Enter your name to create an account.');
        }

        await register({ name, email, password });
      }
    } catch (error) {
      setAuthSubmitting(false);
      Alert.alert('Could not continue', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const continueWithOAuth = async (provider: SocialProvider) => {
    try {
      setSocialLoading(provider);
      pendingOAuthProviderRef.current = provider;
      const redirectUrl = buildCallbackUrl('oauth', provider);

      const { url } = await forumApi.getOAuthUrl(
        provider,
        redirectUrl,
        redirectUrl
      );
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

      if (result.type !== 'success' || !result.url) {
        if (result.type !== 'cancel' && result.type !== 'dismiss') {
          throw new Error('The social sign-in flow did not complete.');
        }

        return;
      }

      const { queryParams } = Linking.parse(result.url);

      if (queryParams?.userId && queryParams?.secret) {
        await completeAuthFromUrl(result.url);
        return;
      }

      if (queryParams?.error) {
        const errorDescription =
          typeof queryParams.error_description === 'string'
            ? queryParams.error_description
            : null;
        throw new Error(errorDescription || String(queryParams.error));
      }

      throw new Error('Could not verify the social login response.');
    } catch (error) {
      pendingOAuthProviderRef.current = null;
      setAuthSubmitting(false);
      Alert.alert(
        'Could not continue',
        error instanceof Error ? error.message : 'Unknown social login error'
      );
    } finally {
      setSocialLoading(null);
    }
  };

  const animatedSetMagicLinkEmailSent = (value: string) => {
    animateLayoutTransition();
    setMagicLinkEmailSent(value);
  };

  const sendMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert('Could not continue', 'Enter your email first.');
      return;
    }

    try {
      setMagicLinkLoading(true);
      await forumApi.requestMagicLink({
        email: email.trim(),
        callbackUrl: buildCallbackUrl('magic'),
      });
      animatedSetMagicLinkEmailSent(email.trim());
      Alert.alert(
        'Check your inbox',
        'We sent you a secure sign-in link. Open it on this device to get back into the app.'
      );
    } catch (error) {
      Alert.alert(
        'Could not continue',
        error instanceof Error ? error.message : 'Could not send the sign-in email'
      );
    } finally {
      setMagicLinkLoading(false);
    }
  };

  const sendRecoveryLink = async () => {
    if (!email.trim()) {
      Alert.alert('Could not continue', 'Enter your email first.');
      return;
    }

    try {
      setRecoveryLoading(true);
      await forumApi.requestPasswordReset({
        email: email.trim(),
        callbackUrl: buildPasswordResetUrl(),
      });
      animatedSetMagicLinkEmailSent('');
      Alert.alert(
        'Reset email sent',
        'We emailed you a password reset link. Open it on this device to choose a new password.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send the password reset email';
      Alert.alert(
        'Could not continue',
        /invalid url param/i.test(message)
          ? 'Password reset needs a public reset URL. Set EXPO_PUBLIC_RESET_BASE_URL to your public backend URL and request a new reset email.'
          : message
      );
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: shellBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: heroTopPadding, paddingBottom: 24 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.stage}>
          <View
            pointerEvents="none"
            style={[
              styles.backgroundAura,
              {
                backgroundColor: isDark ? 'rgba(124, 58, 237, 0.16)' : 'rgba(167, 139, 250, 0.22)',
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.backgroundOrb,
              styles.backgroundOrbTop,
              {
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(96, 165, 250, 0.18)',
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.backgroundOrb,
              styles.backgroundOrbBottom,
              {
                backgroundColor: isDark ? 'rgba(168, 85, 247, 0.12)' : 'rgba(244, 114, 182, 0.14)',
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.45)',
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.cardGlow,
              {
                backgroundColor: isDark ? '#7C3AED' : '#C4B5FD',
                opacity: cardGlowOpacity,
                transform: [{ translateY: cardLift }, { scale: cardScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.authCard,
              {
                backgroundColor: cardBackground,
                borderColor: cardBorder,
                opacity: flipOpacity,
                shadowColor: cardShadow,
                transform: [
                  { perspective: 1200 },
                  { translateX: flipTranslateX },
                  { translateY: flipTranslateY },
                  { translateY: cardLift },
                  { rotateX: cardTiltX },
                  { rotateY: cardTiltY },
                  { rotateY: flipRotateY },
                  { rotateZ: flipRotateZ },
                  { scale: Animated.multiply(cardScale, flipScale) },
                ],
              },
            ]}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glossHighlight,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(255, 255, 255, 0.78)',
                  transform: [{ translateX: glossDrift }, { rotate: '-8deg' }],
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.glossOrb,
                {
                  backgroundColor: isDark
                    ? 'rgba(196, 181, 253, 0.12)'
                    : 'rgba(255, 255, 255, 0.65)',
                },
              ]}
            />
            <View style={styles.cardHeader}>
              <View style={styles.brandLockup}>
                <NexusLogo compact inverted flushLeft />
                <ThemedText style={[styles.brandCaption, { color: subtleText }]}>Developer community</ThemedText>
              </View>
              <Pressable
                disabled={isSwitchingMode || isBusy}
                onPress={toggleMode}
                style={[styles.modeSwitchPill, { backgroundColor: socialPillBackground }]}>
                <ThemedText style={[styles.modeSwitchText, { color: palette.text }]}>
                  {mode === 'login' ? 'Sign up' : 'Log in'}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.heroCopy}>
              <ThemedText style={[styles.title, { color: palette.text }]}>
                {mode === 'login' ? 'Log in' : 'Create your account'}
              </ThemedText>
            </View>

            <View style={styles.utilityRow}>
              <Pressable
                disabled={isBusy}
                onPress={() => void continueWithOAuth('github')}
                style={[styles.socialPill, { backgroundColor: socialPillBackground, borderColor: faintAccent }]}>
                <FontAwesome name="github" size={14} color={palette.text} />
                <ThemedText style={[styles.socialPillText, { color: palette.text }]}>
                  {socialLoading === 'github' ? 'Connecting...' : 'GitHub'}
                </ThemedText>
              </Pressable>
            </View>

            {mode === 'register' ? (
              <View style={[styles.inputShell, { backgroundColor: pillBackground, borderColor: pillBorder }]}>
                <View style={[styles.inputIconBubble, { backgroundColor: faintAccent }]}>
                  <MaterialCommunityIcons name="account-outline" size={16} color={palette.accent} />
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  editable={!isBusy}
                  placeholder="display name"
                  placeholderTextColor={subtleText}
                  style={[styles.inputField, { color: palette.text }]}
                />
              </View>
            ) : null}

            <View style={[styles.inputShell, { backgroundColor: pillBackground, borderColor: pillBorder }]}>
              <View style={[styles.inputIconBubble, { backgroundColor: faintAccent }]}>
                <MaterialCommunityIcons name="at" size={16} color={palette.accent} />
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                editable={!isBusy}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="e-mail address"
                placeholderTextColor={subtleText}
                style={[styles.inputField, { color: palette.text }]}
              />
            </View>

            <View style={[styles.inputShell, { backgroundColor: pillBackground, borderColor: pillBorder }]}>
              <View style={[styles.inputIconBubble, { backgroundColor: faintAccent }]}>
                <MaterialCommunityIcons name="key-variant" size={16} color={palette.accent} />
              </View>
              <TextInput
                value={password}
                onChangeText={setPassword}
                editable={!isBusy}
                secureTextEntry
                placeholder="password"
                placeholderTextColor={subtleText}
                style={[styles.inputField, { color: palette.text }]}
              />
              {mode === 'login' ? (
                <Pressable
                  disabled={recoveryLoading || isBusy}
                  onPress={() => void sendRecoveryLink()}
                  style={[styles.inlineActionPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF' }]}>
                  <ThemedText style={[styles.inlineActionText, { color: palette.accent }]}>
                    {recoveryLoading ? 'Sending...' : 'Forgot password?'}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>

            <Pressable
              disabled={isBusy}
              onPress={submit}
              style={[styles.primaryButton, { backgroundColor: palette.accent, opacity: isBusy ? 0.72 : 1 }]}>
              <ThemedText style={[styles.primaryButtonText, { color: palette.textOnAccent }]}>
                {authSubmitting
                  ? mode === 'login'
                    ? 'Entering Nexus...'
                    : 'Creating account...'
                  : primaryButtonLabel}
              </ThemedText>
            </Pressable>

            {mode === 'login' ? (
              <>
                <Pressable
                  disabled={isBusy}
                  onPress={() => void sendMagicLink()}
                  style={[styles.secondaryButton, { backgroundColor: pillBackground, borderColor: pillBorder }]}>
                  <MaterialCommunityIcons name="email-outline" size={18} color={palette.text} />
                  <ThemedText style={[styles.secondaryButtonText, { color: palette.text }]}>
                    {magicLinkLoading ? 'Sending sign-in link...' : 'Email me a sign-in link'}
                  </ThemedText>
                </Pressable>
                {magicLinkEmailSent ? (
                  <ThemedText style={[styles.magicLinkHint, { color: subtleText }]}>
                    Sign-in link sent to {magicLinkEmailSent}.
                  </ThemedText>
                ) : null}
              </>
            ) : null}

            <ThemedText style={[styles.footerNote, { color: subtleText }]}>
              By continuing you agree to the community guidelines and respectful collaboration standards.
            </ThemedText>
          </Animated.View>
          {authSubmitting ? (
            <Animated.View
              pointerEvents="auto"
              style={[
                styles.authOverlay,
                {
                  backgroundColor: isDark ? 'rgba(7, 6, 17, 0.74)' : 'rgba(244, 237, 247, 0.78)',
                  opacity: authOverlayOpacity,
                },
              ]}>
              <Animated.View
                style={[
                  styles.authOverlayCard,
                  {
                    backgroundColor: isDark ? 'rgba(19, 18, 31, 0.96)' : 'rgba(255, 255, 255, 0.96)',
                    borderColor: isDark ? 'rgba(167, 139, 250, 0.24)' : 'rgba(139, 92, 246, 0.18)',
                    transform: [{ scale: authOverlayScale }],
                  },
                ]}>
                <View
                  style={[
                    styles.authOverlayHalo,
                    { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.26)' : 'rgba(167, 139, 250, 0.28)' },
                  ]}
                />
                <ThemedText style={[styles.authOverlayEyebrow, { color: palette.accent }]}>
                  AUTHENTICATING
                </ThemedText>
                <ThemedText style={[styles.authOverlayTitle, { color: palette.text }]}>
                  {authLoadingMessage}
                </ThemedText>
                <ThemedText style={[styles.authOverlaySubtitle, { color: subtleText }]}>
                  Preparing your workspace, profile, and real-time threads.
                </ThemedText>
                <View style={[styles.authProgressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139,92,246,0.1)' }]}>
                  <Animated.View
                    style={[
                      styles.authProgressBar,
                      {
                        backgroundColor: palette.accent,
                        transform: [{ translateX: glossDrift }],
                      },
                    ]}
                  />
                </View>
              </Animated.View>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  authCard: {
    borderWidth: 1,
    borderRadius: 30,
    marginTop: 'auto',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
  },
  authOverlay: {
    alignItems: 'center',
    borderRadius: 34,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  authOverlayCard: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingVertical: 22,
    width: '88%',
  },
  authOverlayEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  authOverlayHalo: {
    borderRadius: 999,
    height: 120,
    opacity: 0.8,
    position: 'absolute',
    right: -22,
    top: -18,
    width: 120,
  },
  authOverlaySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  authOverlayTitle: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.7,
    lineHeight: 33,
    maxWidth: 260,
  },
  authProgressBar: {
    borderRadius: 999,
    height: '100%',
    width: '42%',
  },
  authProgressTrack: {
    borderRadius: 999,
    height: 8,
    marginTop: 18,
    overflow: 'hidden',
  },
  backgroundAura: {
    borderRadius: 999,
    height: 280,
    left: '10%',
    opacity: 0.9,
    position: 'absolute',
    top: 48,
    width: 280,
  },
  backgroundOrb: {
    borderRadius: 999,
    borderWidth: 1,
    position: 'absolute',
  },
  backgroundOrbBottom: {
    bottom: 54,
    height: 150,
    left: -18,
    width: 150,
  },
  backgroundOrbTop: {
    height: 130,
    right: -10,
    top: 92,
    width: 130,
  },
  brandCaption: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  brandLockup: {
    gap: 2,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardGlow: {
    borderRadius: 34,
    bottom: 8,
    left: 32,
    position: 'absolute',
    right: 32,
    top: 120,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  footerNote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  glossHighlight: {
    borderRadius: 999,
    height: 110,
    left: 18,
    opacity: 0.9,
    position: 'absolute',
    right: 56,
    top: -34,
  },
  glossOrb: {
    borderRadius: 999,
    height: 160,
    opacity: 0.85,
    position: 'absolute',
    right: -36,
    top: 54,
    width: 160,
  },
  heroCopy: {
    gap: 6,
    marginBottom: 14,
    marginTop: 18,
  },
  inlineActionPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  inlineActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 2,
  },
  inputIconBubble: {
    alignItems: 'center',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  inputShell: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  magicLinkHint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  modeSwitchPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeSwitchText: {
    fontSize: 13,
    fontWeight: '700',
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
  secondaryButton: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
    borderRadius: 999,
    paddingVertical: 15,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  socialPill: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  socialPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stage: {
    minHeight: 760,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 34,
  },
  title: {
    fontSize: 34,
    fontWeight: '500',
    letterSpacing: -1,
    lineHeight: 40,
    paddingBottom: 2,
  },
  utilityRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
