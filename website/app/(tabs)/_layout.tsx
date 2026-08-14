import type { BottomTabSceneStyleInterpolator } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';

import { FloatingTabBar } from '@/components/floating-tab-bar';

const magneticSceneInterpolator: BottomTabSceneStyleInterpolator = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, -0.35, 0, 0.35, 1],
      outputRange: [0, 0.16, 1, 0.16, 0],
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-34, 0, 34],
        }),
      },
      {
        translateY: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [10, 0, 10],
        }),
      },
      {
        scale: current.progress.interpolate({
          inputRange: [-1, -0.2, 0, 0.2, 1],
          outputRange: [0.985, 0.992, 1, 0.992, 0.985],
        }),
      },
    ],
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        animationEnabled: true,
        headerShown: false,
        sceneStyleInterpolator: magneticSceneInterpolator,
        transitionSpec: {
          animation: 'spring',
          config: {
            damping: 16,
            mass: 0.9,
            stiffness: 180,
            overshootClamping: false,
          },
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Questions',
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
        }}
      />
    </Tabs>
  );
}
