import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import enEvents from './locales/en/events.json'
import enExport from './locales/en/export.json'
import enZones from './locales/en/zones.json'
import esCommon from './locales/es/common.json'
import esEvents from './locales/es/events.json'
import esExport from './locales/es/export.json'
import esZones from './locales/es/zones.json'

export const LOCALE_STORAGE_KEY = 'swim-time-converter:locale'

export type AppLocale = 'en' | 'es'

const resources = {
  en: {
    common: enCommon,
    events: enEvents,
    zones: enZones,
    export: enExport,
  },
  es: {
    common: esCommon,
    events: esEvents,
    zones: esZones,
    export: esExport,
  },
} as const

function detectLocale(): AppLocale {
  if (typeof window === 'undefined') return 'en'

  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (saved === 'en' || saved === 'es') return saved
  } catch {
    // ignore
  }

  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en'
  if (nav.toLowerCase().startsWith('es')) return 'es'
  return 'en'
}

export function syncDocumentLocale(lng: string): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lng
  document.title = i18n.t('app.title', { ns: 'common' })
  const meta = document.querySelector('meta[name="description"]')
  if (meta) {
    meta.setAttribute('content', i18n.t('app.metaDescription', { ns: 'common' }))
  }
}

void i18n.use(initReactI18next).init({
  resources,
  lng: detectLocale(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'events', 'zones', 'export'],
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', syncDocumentLocale)
syncDocumentLocale(i18n.language)

export default i18n
