import { I18nManager } from 'react-native';

// Fonts
export const fonts = {
  regular: 'Cairo_400Regular' as const,
  semiBold: 'Cairo_600SemiBold' as const,
  bold: 'Cairo_700Bold' as const,
};

// Colors
export const colors = {
  primary: '#f97316',
  primaryDark: '#ea580c',
  primaryLight: '#fdba74',
  violet: '#8b5cf6',
  violetDark: '#7c3aed',
  violetLight: '#c4b5fd',
  success: '#22c55e',
  successLight: '#bbf7d0',
  danger: '#ef4444',
  dangerLight: '#fecaca',
  warning: '#f59e0b',
  warningLight: '#fef3c7',
  info: '#3b82f6',
  infoLight: '#bfdbfe',
  purple: '#a855f7',
  purpleLight: '#f3e8ff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  bg: '#ffffff',
  bgSecondary: '#f9fafb',
  bgTertiary: '#f3f4f6',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border Radius
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Layout helpers
// Note: isRTL is dynamic now. Use I18nManager.isRTL directly in components.
// The layout object is kept for backward compatibility but values should not be trusted.
export const layout = {
  isRTL: I18nManager.isRTL,
  /** محاذاة تلقائية حسب اتجاه اللغة — use I18nManager.isRTL in components */
  textAlignAuto: I18nManager.isRTL ? 'right' as const : 'left' as const,
};
