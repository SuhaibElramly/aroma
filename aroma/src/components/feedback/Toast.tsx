'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useUIStore } from '@/store/ui'

export function Toast() {
  const toast = useUIStore(s => s.toast)

  return (
    <AnimatePresence>
      {toast?.visible && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0,  x: '-50%' }}
          exit={{   opacity: 0, y: 20,  x: '-50%' }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed bottom-24 md:bottom-8 left-1/2 z-[200] flex items-center gap-2
                     bg-aroma-card text-white px-5 py-3 rounded-lg text-[13px] font-sans
                     tracking-wide whitespace-nowrap shadow-xl pointer-events-none select-none"
        >
          <Check size={14} strokeWidth={2.5} />
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
