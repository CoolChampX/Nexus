import { ResizeMode, Video } from 'expo-av';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppearance } from '@/lib/appearance';

type AuthVideoOverlayProps = {
  containerStyle?: StyleProp<ViewStyle>;
  message?: string;
  overlayOpacity?: number;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  subtitle?: string;
};

export function AuthVideoOverlay({
  containerStyle,
  message,
  overlayOpacity,
  pointerEvents = 'auto',
  subtitle,
}: AuthVideoOverlayProps) {
  const { palette, resolvedScheme } = useAppearance();
  const isDark = resolvedScheme === 'dark';

  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        styles.overlay,
        containerStyle,
      ]}>
      <Video
        source={require('../assets/videos/auth-loop.mp4')}
        isLooping
        isMuted
        resizeMode={ResizeMode.COVER}
        shouldPlay
        useNativeControls={false}
        style={styles.video}
      />
      <View
        pointerEvents="none"
        style={[
          styles.videoTint,
          {
            backgroundColor: isDark
              ? `rgba(2, 6, 23, ${overlayOpacity ?? 0.56})`
              : `rgba(248, 247, 250, ${overlayOpacity ?? 0.48})`,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.videoAccent,
          { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.22)' : 'rgba(139, 92, 246, 0.16)' },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.videoAccentOrb,
          { backgroundColor: isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(167, 139, 250, 0.2)' },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.videoAccentOrb,
          styles.videoAccentOrbBottom,
          { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(124, 58, 237, 0.16)' },
        ]}
      />
      {message ? (
        <View style={styles.copyWrap}>
          <ThemedText style={[styles.message, { color: palette.text }]}>{message}</ThemedText>
          {subtitle ? (
            <ThemedText style={[styles.subtitle, { color: isDark ? '#CBD5E1' : palette.muted }]}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copyWrap: {
    alignItems: 'center',
    bottom: 72,
    left: 24,
    position: 'absolute',
    right: 24,
  },
  message: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05070D',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 320,
    textAlign: 'center',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  videoAccent: {
    ...StyleSheet.absoluteFillObject,
  },
  videoAccentOrb: {
    borderRadius: 999,
    height: 160,
    opacity: 0.95,
    position: 'absolute',
    right: -26,
    top: -14,
    width: 160,
  },
  videoAccentOrbBottom: {
    bottom: 90,
    left: -38,
    right: 'auto',
    top: 'auto',
  },
  videoTint: {
    ...StyleSheet.absoluteFillObject,
  },
});
