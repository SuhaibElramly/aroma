import { ref } from 'vue'
import type { PageMeta } from '../types'

export function usePagination<T>(
  fetchFn: (page: number) => Promise<{ data: T[]; meta: PageMeta }>,
) {
  const items   = ref<T[]>([])
  const meta    = ref<PageMeta | null>(null)
  const page    = ref(1)
  const loading = ref(false)
  const error   = ref<string | null>(null)

  async function fetch(p = page.value) {
    loading.value = true
    error.value   = null
    try {
      const res   = await fetchFn(p)
      items.value = res.data
      meta.value  = res.meta
      page.value  = p
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load.'
    } finally {
      loading.value = false
    }
  }

  function changePage(p: number) { fetch(p) }

  return { items, meta, page, loading, error, fetch, changePage }
}
