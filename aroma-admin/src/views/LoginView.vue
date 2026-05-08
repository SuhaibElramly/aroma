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
          <AInput
            v-model="email"
            :label="t('login.email')"
            type="email"
            :placeholder="t('login.emailPlaceholder')"
            autocomplete="email"
            :error="errors.email"
          />
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
const email    = ref('')
const password = ref('')
const loading  = ref(false)
const errors   = ref<Record<string, string>>({})

async function handleLogin() {
  errors.value = {}
  if (!email.value)    { errors.value.email    = t('login.emailRequired');    return }
  if (!password.value) { errors.value.password = t('login.passwordRequired'); return }

  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push({ name: 'dashboard' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : t('login.loginFailed')
    errors.value.general = msg.includes('admin') ? msg : t('login.error')
  } finally {
    loading.value = false
  }
}
</script>
