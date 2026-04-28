'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Search, X, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ProductCard }    from '@/components/shared/ProductCard'
import { EmptyState }     from '@/components/shared/EmptyState'
import { SkeletonGrid }   from '@/components/feedback/SkeletonCard'
import { FilterSidebar }  from './FilterSidebar'
import { useProducts, useCategories, useBrands } from '@/lib/api/queries'
import { SORT_OPTIONS }   from '@/lib/constants'
import type { SearchFilters, SortOption } from '@/types'

export function SearchPageClient() {
  const searchParams = useSearchParams()

  // Single source of truth — everything that affects the API call lives here
  const [filters, setFilters] = useState<SearchFilters>({
    query:    searchParams.get('q')       || undefined,
    category: searchParams.get('category') || null,
    brand:    searchParams.get('brand')    || null,
    type:     searchParams.get('type')     || null,
    special:  searchParams.get('filter')   || null,
    sort:     'featured',
    page:     1,
  })

  // Separate input value so typing feels instant; debounced into filters.query
  const [inputValue, setInputValue]   = useState(searchParams.get('q') || '')
  const [sort, setSort]               = useState<SortOption>('featured')
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: result, isPending, isFetching } = useProducts(filters)
  const products = result?.data ?? []
  const meta     = result?.meta

  const { data: categories = [] } = useCategories()
  const { data: brands = [] }     = useBrands()

  // Sync sort into filters
  useEffect(() => {
    setFilters(prev => ({ ...prev, sort, page: 1 }))
  }, [sort])

  const SPECIAL_LABELS: Record<string, string> = {
    new:        'وصل حديثًا',
    bestseller: 'الأكثر مبيعًا',
    offer:      'عروض',
  }
  const TYPE_LABELS: Record<string, string> = {
    EDP:    'إيو دي بارفان',
    EDT:    'إيو دي تواليت',
    Parfum: 'بارفان',
    EDC:    'إيو دي كولون',
  }
  const resolveLabel = (key: string, val: string) => {
    if (key === 'category') return categories.find(c => String(c.id) === val)?.label ?? val
    if (key === 'special')  return SPECIAL_LABELS[val] ?? val
    if (key === 'type')     return TYPE_LABELS[val] ?? val
    if (key === 'brand')    return brands.find(b => b.id === val)?.name ?? val
    return val
  }

  const handleQueryChange = (value: string) => {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, query: value || undefined, page: 1 }))
    }, 350)
  }

  const updateFilter = (key: keyof SearchFilters, value: string | number | null) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const clearAll = () => {
    setInputValue('')
    setSort('featured')
    setFilters({ query: undefined, category: null, brand: null, type: null, special: null, sort: 'featured', page: 1 })
  }

  const goToPage = (p: number) => {
    setFilters(prev => ({ ...prev, page: p }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeCount = [filters.category, filters.brand, filters.type, filters.special]
    .filter(Boolean).length

  const activeChips = Object.entries({
    category: filters.category,
    brand:    filters.brand,
    type:     filters.type,
    special:  filters.special,
  }).filter(([, v]) => v) as [keyof SearchFilters, string][]

  const currentPage = filters.page ?? 1
  const lastPage    = meta?.lastPage ?? 1

  return (
    <div className="pt-16 flex min-h-screen">
      {/* Sidebar — desktop */}
      <div className="hidden md:block">
        <FilterSidebar
          filters={filters}
          onFilterChange={updateFilter}
          onClearAll={clearAll}
          activeCount={activeCount}
        />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileSidebar && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileSidebar(false)}
              className="md:hidden fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="md:hidden fixed top-0 left-0 bottom-0 z-50 bg-aroma-bg overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-aroma-border">
                <span className="font-sans font-medium text-[14px]">الفلاتر</span>
                <button onClick={() => setMobileSidebar(false)}><X size={18} /></button>
              </div>
              <FilterSidebar
                filters={filters}
                onFilterChange={(k, v) => { updateFilter(k, v); setMobileSidebar(false) }}
                onClearAll={() => { clearAll(); setMobileSidebar(false) }}
                activeCount={activeCount}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 px-6 md:px-10 py-8">
        {/* Search bar */}
        <div className="relative mb-7">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-aroma-faint" />
          <input
            value={inputValue}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="ابحث عن عطر، ماركة..."
            className="w-full pl-11 pr-10 py-3.5 border border-aroma-border rounded-md
                       font-sans text-[14px] bg-white text-aroma-text outline-none
                       focus:border-aroma-text transition-colors"
          />
          {inputValue && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-aroma-faint hover:text-aroma-text"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Active chips */}
        {activeChips.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-5">
            {activeChips.map(([k, v]) => (
              <motion.span
                key={k}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={() => updateFilter(k, null)}
                className="inline-flex items-center gap-1.5 bg-aroma-text text-[#F9F8F4]
                           px-3 py-1.5 rounded-full font-sans text-[12px] cursor-pointer"
              >
                {resolveLabel(k, v)} <X size={11} />
              </motion.span>
            ))}
          </div>
        )}

        {/* Count + sort + mobile filter btn */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebar(true)}
              className="md:hidden flex items-center gap-2 border border-aroma-border
                         rounded px-3 py-2 font-sans text-[13px] text-aroma-muted"
            >
              <SlidersHorizontal size={14} />
              الفلاتر {activeCount > 0 && `(${activeCount})`}
            </button>
            <span className="font-sans text-[13px] text-aroma-muted">
              {meta ? `${meta.total} عطر` : ''}
            </span>
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="border border-aroma-border rounded px-3 py-2 font-sans text-[13px]
                       bg-white text-aroma-text cursor-pointer outline-none"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        <div className={isFetching && !isPending ? 'opacity-60 transition-opacity duration-150' : ''}>
          {isPending ? (
            <SkeletonGrid count={9} compact cols="grid-cols-2 md:grid-cols-3" />
          ) : products.length === 0 ? (
            <EmptyState
              Icon={Search}
              title="لا توجد نتائج"
              subtitle="جرّب تعديل فلاتر البحث أو ابحث بكلمة مختلفة."
              action="مسح الفلاتر"
              onAction={clearAll}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
              {products.map(p => (
                <ProductCard key={p.id} product={p} compact />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-12">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center rounded border border-aroma-border
                         text-aroma-muted hover:text-aroma-text hover:border-aroma-text
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>

            {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className="w-9 h-9 flex items-center justify-center rounded font-sans text-[13px]
                           border transition-colors"
                style={{
                  background:  p === currentPage ? '#1C1917' : 'white',
                  color:       p === currentPage ? '#F9F8F4' : '#4A4540',
                  borderColor: p === currentPage ? '#1C1917' : '#D0CCC8',
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === lastPage}
              className="w-9 h-9 flex items-center justify-center rounded border border-aroma-border
                         text-aroma-muted hover:text-aroma-text hover:border-aroma-text
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
