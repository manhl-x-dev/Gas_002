import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { MMKV } from 'react-native-mmkv';
import ar from './ar';
import en from './en';

const savedLocale = new MMKV().getString('app-locale') || 'ar';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: savedLocale,
    fallbackLng: 'ar',
    react: { useSuspense: false },
  });

export default i18n;
