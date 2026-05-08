import { useColorScheme as useNativeColorScheme } from 'react-native';

import { useAppearance } from '@/lib/appearance';

export function useColorScheme() {
  try {
    return useAppearance().resolvedScheme;
  } catch {
    return useNativeColorScheme();
  }
}
