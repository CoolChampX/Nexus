import { Platform } from 'react-native';

/**
 * Nexus App Color Palette
 * Categorized by Light and Dark modes
 */
export const Colors = {
  common: {
    brandPurple: '#8B5CF6',
    brandPurpleLight: '#A78BFA',
    white: '#FFFFFF',
    black: '#000000',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    errorDark: '#450A0A',
  },
  light: {
    background: '#F8F7FA',
    surface: '#FFFFFF',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    accent: '#8B5CF6',
    accentSoft: '#EDE9FE',
    border: '#E5E7EB',
    icon: '#9CA3AF',
    errorBackground: '#FEF2F2',
    errorText: '#B91C1C',
    errorBorder: '#FCA5A5',
    text: '#1F2937',
    tint: '#8B5CF6',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#8B5CF6',
  },
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    textPrimary: '#F9FAFB',
    textSecondary: '#94A3B8',
    accent: '#A78BFA',
    accentSoft: '#4C1D95',
    border: '#334155',
    icon: '#64748B',
    errorBackground: '#450A0A',
    errorText: '#F87171',
    errorBorder: '#991B1B',
    text: '#F9FAFB',
    tint: '#A78BFA',
    tabIconDefault: '#64748B',
    tabIconSelected: '#A78BFA',
  },
};

export type ThemeColors = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
