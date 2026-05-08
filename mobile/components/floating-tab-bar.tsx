import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppearance } from '@/lib/appearance';
import { useNotifications } from '@/lib/notifications';

const ICONS = {
  index: 'house.fill',
  explore: 'list.bullet.rectangle.fill',
  inbox: 'bell.badge.fill',
  more: 'ellipsis.circle.fill',
} as const;

const LABELS = {
  index: 'Home',
  explore: 'Questions',
  inbox: 'Inbox',
  more: 'More',
} as const;

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { palette, resolvedScheme } = useAppearance();
  const { unreadCount } = useNotifications();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactScreen = width < 390;
  const tabBarWidth = Math.min(width - 28, 368);
  const activeTabAnimation = useRef(new Animated.Value(state.index)).current;
  const magneticMorphAnimation = useRef(new Animated.Value(0)).current;
  const tabWidth = (tabBarWidth - 16) / state.routes.length;
  const barSurface = resolvedScheme === 'dark' ? 'rgba(8, 15, 30, 0.94)' : 'rgba(255, 251, 245, 0.97)';
  const barBorder = resolvedScheme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.18)';
  const activeGlow = resolvedScheme === 'dark' ? 'rgba(167, 139, 250, 0.34)' : 'rgba(139, 92, 246, 0.18)';
  const inactiveIconSurface = resolvedScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.8)';
  const inactiveIconBorder = resolvedScheme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(148, 163, 184, 0.16)';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(activeTabAnimation, {
        toValue: state.index,
        damping: 16,
        mass: 0.9,
        stiffness: 180,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(magneticMorphAnimation, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(magneticMorphAnimation, {
          toValue: 0,
          damping: 12,
          mass: 0.8,
          stiffness: 170,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [activeTabAnimation, magneticMorphAnimation, state.index]);

  const highlightTranslateX = Animated.multiply(activeTabAnimation, tabWidth);
  const highlightScaleX = magneticMorphAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const highlightScaleY = magneticMorphAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });
  const highlightTranslateY = magneticMorphAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1.5],
  });
  const glowScaleX = magneticMorphAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.28],
  });
  const glowOpacity = magneticMorphAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0.8],
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          bottom: Math.max(insets.bottom, 10) + 8,
        },
      ]}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: barSurface,
            borderColor: barBorder,
            shadowOpacity: resolvedScheme === 'dark' ? 0.34 : 0.14,
            width: tabBarWidth,
          },
        ]}>
        <View
          pointerEvents="none"
          style={[
            styles.topSheen,
            {
              backgroundColor: resolvedScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.72)',
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeTabGlow,
            {
              opacity: glowOpacity,
              transform: [{ translateX: highlightTranslateX }, { scaleX: glowScaleX }],
              width: tabWidth,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.activeTabHighlight,
            {
              backgroundColor: activeGlow,
              borderColor: resolvedScheme === 'dark' ? 'rgba(167, 139, 250, 0.28)' : 'rgba(139, 92, 246, 0.18)',
              shadowColor: palette.accent,
              transform: [
                { translateX: highlightTranslateX },
                { translateY: highlightTranslateY },
                { scaleX: highlightScaleX },
                { scaleY: highlightScaleY },
              ],
              width: tabWidth,
            },
          ]}
        />
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : LABELS[route.name as keyof typeof LABELS] ?? route.name;
          const iconName = ICONS[route.name as keyof typeof ICONS];
          const showBadge = route.name === 'inbox' && unreadCount > 0;
          const tintColor = isFocused
            ? resolvedScheme === 'dark'
              ? '#F8FAFC'
              : '#24143B'
            : resolvedScheme === 'dark'
              ? 'rgba(226, 232, 240, 0.74)'
              : '#64748B';
          const iconSurface = isFocused ? palette.accent : inactiveIconSurface;
          const iconBorder = isFocused ? palette.accent : inactiveIconBorder;
          const activeLabelColor = isFocused ? tintColor : palette.muted;

          const onPress = () => {
            if (process.env.EXPO_OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onLongPress={onLongPress}
              onPress={onPress}
              style={styles.tabButton}>
              <View
                style={[
                  styles.tabInner,
                  isFocused
                    ? {
                        backgroundColor: 'transparent',
                        borderColor: 'transparent',
                        shadowColor: palette.accent,
                        shadowOpacity: 0.16,
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: 'transparent',
                        shadowOpacity: 0,
                      },
                ]}>
                {showBadge ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: resolvedScheme === 'dark' ? '#FB7185' : '#E11D48',
                        borderColor: resolvedScheme === 'dark' ? '#0F172A' : '#FFF8F1',
                      },
                    ]}>
                    <ThemedText style={[styles.badgeText, { color: '#FFFFFF' }]}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </ThemedText>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: iconSurface,
                      borderColor: iconBorder,
                    },
                  ]}>
                  <IconSymbol
                    color={isFocused ? palette.textOnAccent : tintColor}
                    name={iconName}
                    size={isCompactScreen ? 20 : 21}
                  />
                </View>
                <ThemedText
                  numberOfLines={1}
                  style={[styles.tabLabel, { color: activeLabelColor }]}>
                  {label}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activeTabGlow: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 32,
    bottom: 12,
    left: 8,
    position: 'absolute',
    top: 12,
  },
  activeTabHighlight: {
    borderRadius: 28,
    borderWidth: 1,
    bottom: 8,
    left: 8,
    position: 'absolute',
    top: 8,
  },
  bar: {
    alignItems: 'stretch',
    borderRadius: 30,
    borderWidth: 1,
    elevation: 0,
    flexDirection: 'row',
    height: 78,
    overflow: 'hidden',
    paddingBottom: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 24,
  },
  badge: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 11,
    top: 6,
    zIndex: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 10,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    marginBottom: 6,
    width: 34,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 3,
    minHeight: 56,
    paddingHorizontal: 6,
    paddingVertical: 7,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 13,
    maxWidth: '100%',
    textAlign: 'center',
  },
  topSheen: {
    borderRadius: 999,
    height: 1,
    left: 18,
    opacity: 0.9,
    position: 'absolute',
    right: 18,
    top: 0,
  },
  wrapper: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
