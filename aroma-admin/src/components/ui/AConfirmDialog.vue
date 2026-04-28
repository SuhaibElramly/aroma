<template>
  <AModal :open="open" :title="title" @close="$emit('cancel')">
    <p class="text-sm text-dash-muted">{{ message }}</p>
    <template #footer>
      <AButton variant="secondary" size="sm" @click="$emit('cancel')">Cancel</AButton>
      <AButton variant="danger" size="sm" :loading="loading" @click="$emit('confirm')">
        {{ confirmLabel }}
      </AButton>
    </template>
  </AModal>
</template>

<script setup lang="ts">
import AModal from './AModal.vue'
import AButton from './AButton.vue'

withDefaults(defineProps<{
  open: boolean
  title?: string
  message?: string
  confirmLabel?: string
  loading?: boolean
}>(), {
  title: 'Are you sure?',
  message: 'This action cannot be undone.',
  confirmLabel: 'Delete',
  loading: false,
})
defineEmits<{ confirm: []; cancel: [] }>()
</script>
