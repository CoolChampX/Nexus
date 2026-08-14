import { ReactNode, useRef } from 'react';
import { Animated, Easing, Pressable, PressableProps } from 'react-native';

type BouncyPressableProps = PressableProps & {
  children: ReactNode;
  scaleTo?: number;
};

export function BouncyPressable({
  children,
  scaleTo = 0.94,
  onPressIn,
  onPressOut,
  style,
  ...props
}: BouncyPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      damping: 12,
      mass: 0.8,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          animateTo(scaleTo);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          Animated.timing(scale, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
          onPressOut?.(event);
        }}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
