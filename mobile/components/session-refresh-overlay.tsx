import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppearance } from '@/lib/appearance';

type SessionRefreshOverlayProps = {
  message?: string;
};

export function SessionRefreshOverlay({
  message = 'Refreshing your workspace...',
}: SessionRefreshOverlayProps) {
  const { palette, resolvedScheme } = useAppearance();
  const isDark = resolvedScheme === 'dark';

  return (
    <View
      pointerEvents="auto"
      style={[
        styles.overlay,
        { backgroundColor: isDark ? '#05070D' : palette.background },
      ]}>
      <Image
        source={require('../assets/images/splash-icon.png')}
        contentFit="contain"
        style={styles.splashImage}
      />
      <ThemedText style={[styles.message, { color: isDark ? '#CBD5E1' : palette.muted }]}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  message: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: -18,
    textAlign: 'center',
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 999,
  },
  splashImage: {
    height: 260,
    width: 260,
  },
});
