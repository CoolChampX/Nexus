import { StyleSheet } from 'react-native';

import { AuthVideoOverlay } from '@/components/auth-video-overlay';

type SessionRefreshOverlayProps = {
  message?: string;
};

export function SessionRefreshOverlay({
  message = 'Refreshing your workspace...',
}: SessionRefreshOverlayProps) {
  return (
    <AuthVideoOverlay
      containerStyle={styles.overlay}
      message={message}
      subtitle="Preparing your workspace and restoring your session."
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 999,
  },
});
