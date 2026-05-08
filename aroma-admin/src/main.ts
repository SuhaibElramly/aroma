// aroma-admin/src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import { useLocale } from './composables/useLocale'
import './style.css'

// Apply saved locale before mount so dir/lang are set before first paint
const { applyLocale } = useLocale()
const saved = localStorage.getItem('admin_locale')
if (saved === 'ar') applyLocale('ar')

createApp(App).use(createPinia()).use(router).use(i18n).mount('#app')
