import { ref } from 'vue'

export function useAsync<T, A extends unknown[]>(fn: (...args: A) => Promise<T>) {
  const data    = ref<T | null>(null)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function execute(...args: A) {
    loading.value = true
    error.value   = null
    try {
      data.value = await fn(...args)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Something went wrong.'
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
