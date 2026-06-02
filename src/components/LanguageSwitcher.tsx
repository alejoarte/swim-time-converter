import { useTranslation } from 'react-i18next'

import i18n, { LOCALE_STORAGE_KEY, type AppLocale, syncDocumentLocale } from '../i18n'

export function LanguageSwitcher() {
  const { t, i18n: i18nInstance } = useTranslation()
  const current = (i18nInstance.language.startsWith('es') ? 'es' : 'en') as AppLocale

  const setLocale = (lng: AppLocale) => {
    if (lng === current) return
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, lng)
    } catch {
      // ignore
    }
    void i18n.changeLanguage(lng).then(() => syncDocumentLocale(lng))
  }

  return (
    <div
      className="language-switch"
      role="group"
      aria-label={t('language.label')}
    >
      <button
        type="button"
        className={
          current === 'en'
            ? 'language-switch-btn language-switch-btn--active'
            : 'language-switch-btn'
        }
        onClick={() => setLocale('en')}
        aria-current={current === 'en' ? 'true' : undefined}
      >
        {t('language.en')}
      </button>
      <button
        type="button"
        className={
          current === 'es'
            ? 'language-switch-btn language-switch-btn--active'
            : 'language-switch-btn'
        }
        onClick={() => setLocale('es')}
        aria-current={current === 'es' ? 'true' : undefined}
      >
        {t('language.es')}
      </button>
    </div>
  )
}
