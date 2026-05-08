// aroma-admin/src/composables/useLocale.ts
import { ref } from 'vue'
import { i18n } from '../i18n'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'

type Locale = 'en' | 'ar'

const locale = ref<Locale>((localStorage.getItem('admin_locale') as Locale) ?? 'en')

export function useLocale() {
  function applyLocale(l: Locale) {
    locale.value = l
    i18n.global.locale.value = l
    document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = l
    dayjs.locale(l)
    localStorage.setItem('admin_locale', l)
  }

  function toggleLocale() {
    applyLocale(locale.value === 'en' ? 'ar' : 'en')
  }

  return { locale, applyLocale, toggleLocale }
}
