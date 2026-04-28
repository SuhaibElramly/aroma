<template>
  <Teleport to="body">
    <Transition name="backdrop">
      <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-dash-text/20 backdrop-blur-[4px]" @click="$emit('close')" />
        <Transition name="panel">
          <div
            v-if="open"
            class="relative z-10 w-full bg-dash-surface rounded-card shadow-modal flex flex-col max-h-[90vh]"
            :class="wide ? 'max-w-2xl' : 'max-w-md'"
          >
            <div class="flex items-center justify-between px-6 py-4 border-b border-dash-border">
              <h2 class="text-sm font-semibold text-dash-text">{{ title }}</h2>
              <button
                @click="$emit('close')"
                class="text-dash-faint hover:text-dash-text transition-colors rounded-lg p-1 -mr-1 hover:bg-dash-bg"
              >
                <X :size="15" />
              </button>
            </div>
            <div class="overflow-y-auto px-6 py-5 flex-1">
              <slot />
            </div>
            <div v-if="$slots.footer" class="flex justify-end gap-2 px-6 py-4 border-t border-dash-border bg-dash-bg rounded-b-card">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'
defineProps<{ open: boolean; title: string; wide?: boolean }>()
defineEmits<{ close: [] }>()
</script>

<style scoped>
.backdrop-enter-active, .backdrop-leave-active { transition: opacity 0.18s ease; }
.backdrop-enter-from, .backdrop-leave-to { opacity: 0; }

.panel-enter-active { transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
.panel-leave-active { transition: opacity 0.14s ease, transform 0.14s ease; }
.panel-enter-from { opacity: 0; transform: translateY(12px) scale(0.97); }
.panel-leave-to   { opacity: 0; transform: translateY(4px) scale(0.99); }
</style>
