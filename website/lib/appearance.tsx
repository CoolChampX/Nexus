import {
  createContext,
  ReactNode,
  useEffect,
  useContext,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorSchemeName, useColorScheme as useNativeColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemePalette = {
  accent: string;
  accentSoft: string;
  background: string;
  border: string;
  card: string;
  cardAlt: string;
  danger: string;
  dangerSoft: string;
  hero: string;
  heroText: string;
  input: string;
  muted: string;
  subtle: string;
  text: string;
  textOnAccent: string;
};

const palettes: Record<'light' | 'dark', ThemePalette> = {
  light: {
    accent: Colors.light.accent,
    accentSoft: Colors.light.accentSoft,
    background: Colors.light.background,
    border: Colors.light.border,
    card: Colors.light.surface,
    cardAlt: '#F8F7FA',
    danger: Colors.light.errorText,
    dangerSoft: Colors.light.errorBackground,
    hero: '#FFFDF8',
    heroText: Colors.light.textPrimary,
    input: '#F9FAFB',
    muted: Colors.light.textSecondary,
    subtle: '#F3F4F6',
    text: Colors.light.textPrimary,
    textOnAccent: Colors.common.white,
  },
  dark: {
    accent: Colors.dark.accent,
    accentSoft: Colors.dark.accentSoft,
    background: Colors.dark.background,
    border: Colors.dark.border,
    card: Colors.dark.surface,
    cardAlt: '#312E81',
    danger: Colors.dark.errorText,
    dangerSoft: Colors.dark.errorBackground,
    hero: '#111827',
    heroText: Colors.dark.textPrimary,
    input: '#111C31',
    muted: Colors.dark.textSecondary,
    subtle: '#172033',
    text: Colors.dark.textPrimary,
    textOnAccent: Colors.common.black,
  },
};

type AppearanceContextValue = {
  mode: ThemeMode;
  resolvedScheme: 'light' | 'dark';
  palette: ThemePalette;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);
const APPEARANCE_MODE_STORAGE_KEY = 'nexus.appearance.mode';

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useNativeColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    let active = true;

    const restoreMode = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(APPEARANCE_MODE_STORAGE_KEY);

        if (!active || !storedMode || !['system', 'light', 'dark'].includes(storedMode)) {
          return;
        }

        setMode(storedMode as ThemeMode);
      } catch {
        // Keep the system mode fallback when storage is unavailable.
      }
    };

    void restoreMode();

    return () => {
      active = false;
    };
  }, []);

  const persistMode = (nextMode: ThemeMode) => {
    setMode(nextMode);
    void AsyncStorage.setItem(APPEARANCE_MODE_STORAGE_KEY, nextMode).catch(() => undefined);
  };

  const resolvedScheme = (mode === 'system' ? systemScheme ?? 'light' : mode) as 'light' | 'dark';

  const value = useMemo(
    () => ({
      mode,
      resolvedScheme,
      palette: palettes[resolvedScheme],
      setMode: persistMode,
      toggleTheme: () => {
        const nextMode =
          mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
        persistMode(nextMode);
      },
    }),
    [mode, resolvedScheme]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);

  if (!context) {
    throw new Error('useAppearance must be used inside AppearanceProvider');
  }

  return context;
}

export function getResolvedScheme(
  mode: ThemeMode,
  systemScheme: ColorSchemeName
): 'light' | 'dark' {
  return (mode === 'system' ? systemScheme ?? 'light' : mode) as 'light' | 'dark';
}
