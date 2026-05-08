import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';

type HapticTabProps = BottomTabBarButtonProps & {
  selectedBackgroundColor: string;
  selectedBorderColor: string;
  selectedShadowColor: string;
  idleBackgroundColor: string;
  idleBorderColor: string;
  activeGlowColor: string;
};

export function HapticTab(props: HapticTabProps) {
  const isSelected = Boolean(props.accessibilityState?.selected);

  return (
    <PlatformPressable
      {...props}
      style={[styles.button, props.style]}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}>
      <View
        style={[
          styles.inner,
          isSelected
            ? [
                styles.innerSelected,
                {
                  backgroundColor: props.selectedBackgroundColor,
                  borderColor: props.selectedBorderColor,
                  shadowColor: props.selectedShadowColor,
                },
              ]
            : [
                styles.innerIdle,
                {
                  backgroundColor: props.idleBackgroundColor,
                  borderColor: props.idleBorderColor,
                },
              ],
        ]}>
        {isSelected ? (
          <View
            pointerEvents="none"
            style={[styles.activeGlow, { backgroundColor: props.activeGlowColor }]}
          />
        ) : null}
        <View
          pointerEvents="none"
          style={[styles.topSheen, isSelected ? styles.topSheenSelected : styles.topSheenIdle]}
        />
        <View style={styles.content}>{props.children}</View>
      </View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 1,
  },
  activeGlow: {
    borderRadius: 999,
    height: 38,
    left: '50%',
    marginLeft: -19,
    opacity: 0.3,
    position: 'absolute',
    top: -1,
    width: 38,
  },
  inner: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 50,
    overflow: 'visible',
    paddingHorizontal: 8,
    paddingVertical: 4,
    transform: [{ scale: 1 }],
  },
  innerIdle: {
    shadowOpacity: 0,
    elevation: 0,
  },
  innerSelected: {
    elevation: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    transform: [{ scale: 1 }],
  },
  topSheen: {
    borderRadius: 999,
    height: 12,
    left: 10,
    position: 'absolute',
    right: 10,
    top: 3,
  },
  topSheenIdle: {
    backgroundColor: 'transparent',
  },
  topSheenSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});
