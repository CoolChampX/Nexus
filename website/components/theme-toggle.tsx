import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { useAppearance, type ThemeMode } from '@/lib/appearance';

import { ThemedText } from './themed-text';
import { IconSymbol } from './ui/icon-symbol';

const OPTIONS: {
  label: string;
  mode: ThemeMode;
  icon: string;
}[] = [
  { label: 'Light', mode: 'light', icon: 'sun.max.fill' },
  { label: 'System', mode: 'system', icon: 'circle.lefthalf.filled' },
  { label: 'Dark', mode: 'dark', icon: 'moon.stars.fill' },
];

export function ThemeToggle() {
  const { mode, palette, setMode } = useAppearance();
  const [shellWidth, setShellWidth] = useState(0);
  const highlightX = useRef(new Animated.Value(0)).current;
  const activeIndex = OPTIONS.findIndex((option) => option.mode === mode);
  const innerPadding = 8;
  const gap = 8;
  const segmentWidth = shellWidth ? (shellWidth - innerPadding * 2 - gap * 2) / 3 : 0;

  useEffect(() => {
    if (!segmentWidth) {
      return;
    }

    Animated.timing(highlightX, {
      toValue: activeIndex * (segmentWidth + gap),
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, gap, highlightX, segmentWidth]);

  return (
    <View
      onLayout={(event) => setShellWidth(event.nativeEvent.layout.width)}
      style={[
        styles.shell,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
      ]}>
      {segmentWidth ? (
        <Animated.View
          style={[
            styles.highlight,
            {
              backgroundColor: palette.accent,
              transform: [{ translateX: highlightX }],
              width: segmentWidth,
            },
          ]}
        />
      ) : null}

      {OPTIONS.map((option) => {
        const active = mode === option.mode;

        return (
          <Pressable key={option.mode} onPress={() => setMode(option.mode)} style={styles.option}>
            <IconSymbol
              name={option.icon as never}
              size={16}
              color={active ? palette.textOnAccent : palette.muted}
            />
            <ThemedText
              style={[
                styles.optionText,
                {
                  color: active ? palette.textOnAccent : palette.text,
                },
              ]}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  highlight: {
    borderRadius: 12,
    bottom: 8,
    left: 8,
    position: 'absolute',
    top: 8,
  },
  option: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 12,
    zIndex: 1,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  shell: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
    padding: 8,
    position: 'relative',
  },
});
