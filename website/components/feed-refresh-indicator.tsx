import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAppearance } from '@/lib/appearance';

type FeedRefreshIndicatorProps = {
  pullDistance: number;
  refreshing: boolean;
  topInset: number;
};

const PULL_THRESHOLD = 110;

export function FeedRefreshIndicator({
  pullDistance,
  refreshing,
  topInset,
}: FeedRefreshIndicatorProps) {
  const { palette, resolvedScheme } = useAppearance();
  const reloadSpin = useRef(new Animated.Value(0)).current;
  const signalBounce = useRef(new Animated.Value(0)).current;
  const haloPulse = useRef(new Animated.Value(0)).current;
  const refreshLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const visible = refreshing || progress > 0.02;

  useEffect(() => {
    if (!refreshing) {
      refreshLoopRef.current?.stop();
      refreshLoopRef.current = null;
      reloadSpin.stopAnimation();
      signalBounce.stopAnimation();
      haloPulse.stopAnimation();
      reloadSpin.setValue(0);
      signalBounce.setValue(0);
      haloPulse.setValue(progress);
      return;
    }

    reloadSpin.setValue(0);
    signalBounce.setValue(0);
    haloPulse.setValue(0);

    refreshLoopRef.current = Animated.loop(
      Animated.parallel([
        Animated.timing(reloadSpin, {
          toValue: 1,
          duration: 920,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(signalBounce, {
              toValue: 1,
              duration: 380,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(signalBounce, {
              toValue: 0,
              duration: 380,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(haloPulse, {
              toValue: 1,
              duration: 560,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(haloPulse, {
              toValue: 0.2,
              duration: 560,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
          ])
        ),
      ])
    );

    refreshLoopRef.current.start();

    return () => {
      refreshLoopRef.current?.stop();
      refreshLoopRef.current = null;
    };
  }, [haloPulse, progress, refreshing, reloadSpin, signalBounce]);

  if (!visible) {
    return null;
  }

  const indicatorOpacity = refreshing ? 1 : 0.36 + progress * 0.64;
  const indicatorScale = refreshing ? 1 : 0.88 + progress * 0.12;
  const indicatorTranslateY = refreshing ? 0 : 14 - progress * 14;
  const signalRotation = refreshing ? '0deg' : `${-10 + progress * 10}deg`;
  const signalTranslateY = refreshing
    ? signalBounce.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -4],
      })
    : 8 - progress * 8;
  const reloadRotate = refreshing
    ? reloadSpin.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      })
    : `${progress * 220}deg`;
  const haloScale = refreshing
    ? haloPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 1.08],
      })
    : 0.92 + progress * 0.16;
  const haloOpacity = refreshing
    ? haloPulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.28, 0.5],
      })
    : 0.18 + progress * 0.26;
  const trackColor =
    resolvedScheme === 'dark' ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.12)';
  const surfaceColor =
    resolvedScheme === 'dark' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 251, 245, 0.96)';
  const borderColor =
    resolvedScheme === 'dark' ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.18)';

  return (
    <View pointerEvents="none" style={[styles.wrapper, { top: topInset + 8 }]}>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: surfaceColor,
            borderColor,
            opacity: indicatorOpacity,
            transform: [{ translateY: indicatorTranslateY }, { scale: indicatorScale }],
          },
        ]}>
        <Animated.View
          style={[
            styles.halo,
            {
              backgroundColor: palette.accentSoft,
              opacity: haloOpacity,
              transform: [{ scale: haloScale }],
            },
          ]}
        />
        <View style={[styles.handChip, { backgroundColor: palette.accent }]}>
          <Animated.View
            style={{
              transform: [{ translateY: signalTranslateY }, { rotate: signalRotation }],
            }}>
            <MaterialIcons name="memory" size={20} color={palette.textOnAccent} />
          </Animated.View>
        </View>

        <View style={styles.copy}>
          <ThemedText style={[styles.title, { color: palette.text }]}>
            {refreshing ? 'Syncing signal' : progress > 0.9 ? 'Release to resync' : 'Pull to sync'}
          </ThemedText>
          <ThemedText style={[styles.body, { color: palette.muted }]}>
            {refreshing
              ? 'Streaming fresh threads from the next node.'
              : 'Drag down and release to sync the latest questions.'}
          </ThemedText>
        </View>

        <View style={[styles.reloadTrack, { backgroundColor: trackColor }]}>
          <Animated.View style={{ transform: [{ rotate: reloadRotate }] }}>
            <MaterialIcons name="autorenew" size={18} color={palette.accent} />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 12,
    lineHeight: 16,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  halo: {
    borderRadius: 999,
    bottom: 10,
    left: 10,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  handChip: {
    alignItems: 'center',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  indicator: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    width: '100%',
  },
  reloadTrack: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  wrapper: {
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 20,
  },
});
