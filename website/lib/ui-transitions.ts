import { LayoutAnimation, Platform, UIManager } from 'react-native';

let enabled = false;
const isFabric =
  typeof global !== 'undefined' &&
  Boolean((global as { nativeFabricUIManager?: unknown }).nativeFabricUIManager);

export function enableLayoutTransitions() {
  if (enabled || Platform.OS !== 'android') {
    enabled = true;
    return;
  }

  if (!isFabric) {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
  }
  enabled = true;
}

export function animateLayoutTransition() {
  enableLayoutTransitions();
  LayoutAnimation.configureNext({
    duration: 220,
    update: {
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    create: {
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
  });
}
