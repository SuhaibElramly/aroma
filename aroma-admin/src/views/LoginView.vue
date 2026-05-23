<template>
  <div class="flex min-h-screen items-center justify-center bg-dash-bg px-4">
    <div class="w-full max-w-sm">
      <!-- Brand mark -->
      <div class="mb-8 text-center">
        <div class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-dash-primary shadow-card">
          <span class="text-sm font-bold text-white tracking-[0.15em]">AR</span>
        </div>
        <h1 class="text-lg font-semibold text-dash-text">{{ t('login.title') }}</h1>
        <p class="mt-1.5 text-xs text-dash-muted">{{ t('login.subtitle') }}</p>
      </div>

      <!-- Form card -->
      <div class="rounded-card bg-dash-surface border border-dash-border p-7 shadow-card">
        <form @submit.prevent="handleLogin" class="space-y-4" novalidate>
          <!-- Phone input with Libyan flag prefix -->
          <div class="flex flex-col gap-1.5">
            <label class="text-2xs font-semibold text-dash-muted uppercase tracking-wider">
              {{ t('login.phone') }}
            </label>
            <div
              class="flex rounded-btn border overflow-hidden transition-all duration-200"
              :class="errors.phone
                ? 'border-dash-danger bg-dash-danger-lt/40'
                : 'border-dash-border hover:border-dash-muted/40 focus-within:border-dash-primary focus-within:ring-2 focus-within:ring-dash-primary/10'"
            >
              <!-- Flag + country code -->
              <div class="flex items-center gap-1.5 px-3 bg-dash-paper-2 border-r border-dash-border shrink-0 select-none">
                <span class="text-sm leading-none">🇱🇾</span>
                <span class="text-xs font-semibold text-dash-text-2 tracking-wide">+218</span>
              </div>
              <!-- Local number -->
              <input
                v-model="phone"
                type="tel"
                inputmode="numeric"
                :placeholder="t('login.phonePlaceholder')"
                autocomplete="tel-national"
                dir="ltr"
                class="flex-1 px-3 py-2 text-xs text-dash-text placeholder:text-dash-faint bg-transparent outline-none"
              />
            </div>
            <p v-if="errors.phone" class="text-2xs text-dash-danger">{{ errors.phone }}</p>
          </div>
          <AInput
            v-model="password"
            :label="t('login.password')"
            type="password"
            :placeholder="t('login.passwordPlaceholder')"
            autocomplete="current-password"
            :error="errors.password"
          />
          <div
            v-if="errors.general"
            class="rounded-btn bg-dash-danger-lt border border-dash-danger/20 px-3 py-2.5 text-xs text-dash-danger"
          >
            {{ errors.general }}
          </div>
          <AButton type="submit" class="w-full justify-center mt-2" :loading="loading">
            {{ t('login.submit') }}
          </AButton>
        </form>
      </div>

      <p class="mt-6 text-center text-2xs text-dash-faint">
        {{ t('login.footer') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import AInput  from '../components/ui/AInput.vue'
import AButton from '../components/ui/AButton.vue'

const router   = useRouter()
const { t }    = useI18n()
const auth     = useAuthStore()
const phone    = ref('')
const password = ref('')
const loading  = ref(false)
const errors   = ref<Record<string, string>>({})

// Normalise whatever the user types into +218XXXXXXXXX stored format
function normalizePhone(raw: string): string {
  // Strip spaces, dashes, parentheses
  let digits = raw.replace(/[\s\-()]/g, '')
  // Strip leading 0  (0919…  →  919…)
  if (digits.startsWith('0')) digits = digits.slice(1)
  // Strip +218 / 218 prefix if user accidentally included it
  if (digits.startsWith('+218')) digits = digits.slice(4)
  else if (digits.startsWith('218')) digits = digits.slice(3)
  return '+218' + digits
}

async function handleLogin() {
  errors.value = {}
  if (!phone.value.trim()) { errors.value.phone    = t('login.phoneRequired');    return }
  if (!password.value)     { errors.value.password = t('login.passwordRequired'); return }

  loading.value = true
  try {
    await auth.login(normalizePhone(phone.value), password.value)
    router.push({ name: 'dashboard' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('login.loginFailed')
    errors.value.general = msg.includes('admin') ? msg : t('login.error')
  } finally {
    loading.value = false
  }
}
</script>
