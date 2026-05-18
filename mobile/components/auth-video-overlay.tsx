import { ResizeMode, Video } from 'expo-av';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppearance } from '@/lib/appearance';

type AuthVideoOverlayProps = {
  containerStyle?: StyleProp<ViewStyle>;
  message: string;
  subtitle?: string;
};

export function AuthVideoOverlay({
  containerStyle,
  message,
  subtitle,
}: AuthVideoOverlayProps) {
  const { palette, resolvedScheme } = useAppearance();
  const isDark = resolvedScheme === 'dark';

  return (
    <View
      pointerEvents="auto"
      style={[
        styles.overlay,
        { backgroundColor: isDark ? 'rgba(5, 7, 13, 0.92)' : 'rgba(248, 247, 250, 0.94)' },
        containerStyle,
      ]}>
      <View
        style={[
          styles.videoFrame,
          {
            backgroundColor: isDark ? '#0B1020' : '#FFFFFF',
            borderColor: isDark ? 'rgba(167, 139, 250, 0.2)' : 'rgba(139, 92, 246, 0.14)',
            shadowColor: isDark ? '#020617' : '#C4B5FD',
          },
        ]}>
        <Video
          source={require('../assets/videos/auth-loop.mp4')}
          isLooping
          isMuted
          resizeMode={ResizeMode.COVER}
          shouldPlay
          style={styles.video}
        />
        <View
          pointerEvents="none"
          style={[
            styles.videoTint,
            { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.48)' : 'rgba(248, 247, 250, 0.38)' },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.videoAccent,
            { backgroundColor: isDark ? 'rgba(124, 58, 237, 0.26)' : 'rgba(139, 92, 246, 0.18)' },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.videoAccentOrb,
            { backgroundColor: isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(167, 139, 250, 0.22)' },
          ]}
        />
      </View>
      <ThemedText style={[styles.message, { color: palette.text }]}>{message}</ThemedText>
      {subtitle ? (
        <ThemedText style={[styles.subtitle, { color: isDark ? '#CBD5E1' : palette.muted }]}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
    marginTop: 20,
    textAlign: 'center',
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 280,
    textAlign: 'center',
  },
  video: {
    height: '100%',
    width: '100%',
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
  videoFrame: {
    borderRadius: 30,
    borderWidth: 1,
    elevation: 14,
    height: 260,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.24,
    shadowRadius: 34,
    width: 260,
  },
  videoTint: {
    ...StyleSheet.absoluteFillObject,
  },
});
