'use client'

import { Check } from 'lucide-react'
import { BRANDS } from '@/mocks/data'
import { useCategories } from '@/lib/api/queries'
import type { SearchFilters } from '@/types'

interface Props {
  filters:        SearchFilters
  onFilterChange: (key: keyof SearchFilters, value: string | number | null) => void
  onClearAll:     () => void
  activeCount:    number
}

const STATIC_GROUPS = [
  {
    key:   'special' as const,
    label: 'مميز',
    opts: [
      ['new',        'وصل حديثًا'],
      ['bestseller', 'الأكثر مبيعًا'],
      ['offer',      'عروض'],
    ] as [string, string][],
  },
  {
    key:   'type' as const,
    label: 'التركيز',
    opts: [
      ['EDP',    'إيو دي بارفان'],
      ['EDT',    'إيو دي تواليت'],
      ['Parfum', 'بارفان'],
    ] as [string, string][],
  },
  {
    key:   'brand' as const,
    label: 'الماركة',
    opts: BRANDS.map(b => [b.id, b.name]) as [string, string][],
  },
]

function FilterCheckbox({
  active,
  label,
  onClick,
}: {
  active:  boolean
  label:   string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2.5 py-[7px] cursor-pointer"
      role="checkbox"
      aria-checked={active}
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
    >
      <div
        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
        style={{
          border:     active ? '2px solid #1C1917' : '1.5px solid #D0CCC8',
          background: active ? '#1C1917' : 'transparent',
          color:      'white',
        }}
      >
        {active && <Check size={10} strokeWidth={3} />}
      </div>
      <span className={`font-sans text-[13px] ${active ? 'text-aroma-text' : 'text-[#4A4540]'}`}>
        {label}
      </span>
    </div>
  )
}

export function FilterSidebar({ filters, onFilterChange, onClearAll, activeCount }: Props) {
  const { data: categories = [] } = useCategories()

  return (
    <aside className="w-[260px] shrink-0 border-r border-aroma-border px-6 py-8 sticky top-16
                      h-[calc(100vh-64px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <span className="font-sans text-[13px] font-medium text-aroma-text">
          الفلاتر{' '}
          {activeCount > 0 && (
            <span className="text-aroma-accent">({activeCount})</span>
          )}
        </span>
        {activeCount > 0 && (
          <button
            onClick={onClearAll}
            className="font-sans text-[12px] text-aroma-muted hover:text-aroma-text transition-colors"
          >
            مسح الكل
          </button>
        )}
      </div>

      {/* Category — from API */}
      {categories.length > 0 && (
        <div className="mb-7">
          <p className="font-sans text-[11px] text-aroma-faint mb-3">الفئة</p>
          {categories.map(cat => {
            const val = String(cat.id)
            const active = filters.category === val
            return (
              <FilterCheckbox
                key={cat.id}
                label={cat.label}
                active={active}
                onClick={() => onFilterChange('category', active ? null : val)}
              />
            )
          })}
        </div>
      )}

      {/* Static filter groups */}
      {STATIC_GROUPS.map(group => {
        const current = filters[group.key] as string | null | undefined
        return (
          <div key={group.key} className="mb-7">
            <p className="font-sans text-[11px] text-aroma-faint mb-3">
              {group.label}
            </p>
            {group.opts.map(([val, label]) => (
              <FilterCheckbox
                key={val}
                label={label}
                active={current === val}
                onClick={() => onFilterChange(group.key, current === val ? null : val)}
              />
            ))}
          </div>
        )
      })}
    </aside>
  )
}
