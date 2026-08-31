import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources.generated'

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: resources.en },
    th: { translation: resources.th },
  },
  lng: 'th',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export function languageCode(language: 'TH' | 'EN') {
  return language === 'TH' ? 'th' : 'en'
}

export default i18n
