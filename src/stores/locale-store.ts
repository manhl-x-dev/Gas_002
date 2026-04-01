import { create } from 'zustand';
import { MMKV } from 'react-native-mmkv';

export type AppLocale = 'ar' | 'en';

const mmkv = new MMKV();

interface LocaleState {
  locale: AppLocale;
  isRTL: boolean;
  setLocale: (locale: AppLocale) => void;
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: (mmkv.getString('app-locale') || 'ar') as AppLocale,
  isRTL: (mmkv.getString('app-locale') || 'ar') === 'ar',
  setLocale: (locale) => {
    mmkv.set('app-locale', locale);
    set({ locale, isRTL: locale === 'ar' });
  },
}));
