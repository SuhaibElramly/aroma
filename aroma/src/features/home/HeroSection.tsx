'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { HeroConfig } from '@/types'

const SCENT_WORDS = [
  { word: 'وردة',    top: '12%', left: '10%', delay: 0,   size: 11 },
  { word: 'عود',     top: '22%', left: '72%', delay: 1.2, size: 10 },
  { word: 'عنبر',    top: '55%', left: '8%',  delay: 2.1, size: 10 },
  { word: 'زعفران',  top: '72%', left: '68%', delay: 0.8, size: 9  },
  { word: 'فيتيفر',  top: '85%', left: '20%', delay: 1.7, size: 9  },
  { word: 'مسك',     top: '38%', left: '80%', delay: 0.4, size: 10 },
  { word: 'نيرولي',  top: '65%', left: '42%', delay: 2.5, size: 9  },
]

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 22 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
})

export function HeroSection({ hero }: { hero: HeroConfig }) {
  const router = useRouter()

  return (
    <div
      className="h-screen min-h-[640px] relative overflow-hidden grid grid-cols-1 md:grid-cols-2"
      style={{ background: '#120F0C' }}
    >
      {/* ── Left: Editorial copy ─────────────────────────────── */}
      <div className="flex flex-col justify-center px-8 md:px-16 pt-24 pb-12 relative z-10">
        <div className="w-9 h-px bg-aroma-accent mb-7" />

        <motion.p {...fadeUp(0)} className="font-sans text-[11px] tracking-[0.18em] text-aroma-accent mb-8">
          SMELL GOOD, FEEL GOOD
        </motion.p>

        <motion.div {...fadeUp(0.12)}>
          <h1
            className="leading-[1.12] mb-9"
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 300,
              fontSize:   'clamp(40px, 4.5vw, 72px)',
              color:      '#F4EFE8',
            }}
          >
            {hero.headline}
          </h1>
        </motion.div>

        <motion.p {...fadeUp(0.24)} className="font-sans text-[15px] font-light text-[rgba(244,239,232,0.5)] leading-[1.8] max-w-[340px] mb-11">
          {hero.subtext}
        </motion.p>

        <motion.div {...fadeUp(0.36)} className="flex gap-3 flex-wrap">
          <button
            onClick={() => router.push(hero.cta_primary_url)}
            className="bg-aroma-accent text-aroma-dark font-sans text-[12px] font-semibold
                       px-8 py-3.5 rounded-sm transition-opacity hover:opacity-90"
          >
            {hero.cta_primary_label}
          </button>
          <button
            onClick={() => router.push(hero.cta_secondary_url)}
            className="border border-[rgba(244,239,232,0.2)] text-[rgba(244,239,232,0.7)]
                       font-sans text-[12px] px-8 py-3.5 rounded-sm
                       hover:bg-white/5 transition-colors"
          >
            {hero.cta_secondary_label}
          </button>
        </motion.div>
      </div>

      {/* ── Right: image or animated bottle ──────────────────── */}
      <div className="hidden md:block relative overflow-hidden">
        {hero.bg_image_url ? (
          <>
            <img
              src={hero.bg_image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-[#120F0C]/50" />
          </>
        ) : (
          <>
            {/* Ambient glow */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '20%', left: '30%',
                width: 420, height: 420,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(184,150,110,0.18) 0%, transparent 70%)',
              }}
            />

            {/* Floating scent words */}
            {SCENT_WORDS.map(({ word, top, left, delay, size }) => (
              <motion.div
                key={word}
                animate={{ opacity: [0.18, 0.32, 0.18] }}
                transition={{ duration: 4, delay, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', top, left, fontSize: size }}
                className="font-display italic text-aroma-accent tracking-[0.14em] pointer-events-none select-none"
              >
                {word}
              </motion.div>
            ))}

            {/* Bottle composition */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[54%]">
              <motion.div
                animate={{ y: [0, -22, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(184,150,110,0.12)' }}
              />
              <motion.div
                animate={{ y: [0, -22, 0] }}
                transition={{ duration: 9, delay: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(184,150,110,0.08)' }}
              />
              <motion.div
                animate={{ y: [0, -18, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 110, height: 200,
                  background: 'linear-gradient(155deg, rgba(184,150,110,0.55) 0%, rgba(120,90,60,0.35) 50%, rgba(80,55,30,0.45) 100%)',
                  borderRadius: '40% 40% 30% 30% / 20% 20% 40% 40%',
                  border: '1px solid rgba(184,150,110,0.4)',
                  boxShadow: '0 0 60px rgba(184,150,110,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
                  position: 'relative',
                }}
              >
                <div style={{
                  position: 'absolute', top: '8%', left: '20%',
                  width: 12, height: '55%', borderRadius: 6,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
                }} />
                <div style={{
                  position: 'absolute', bottom: '22%', left: '12%', right: '12%',
                  height: 50, border: '1px solid rgba(184,150,110,0.3)',
                  borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span className="font-display text-[10px] tracking-[0.2em] text-[rgba(244,239,232,0.6)]">أروما</span>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, -18, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 38, height: 42, margin: '-2px auto 0',
                  background: 'linear-gradient(155deg, rgba(184,150,110,0.5), rgba(100,70,40,0.4))',
                  borderRadius: '4px 4px 0 0',
                  border: '1px solid rgba(184,150,110,0.3)',
                  borderBottom: 'none',
                }}
              />
              <motion.div
                animate={{ y: [0, -18, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 52, height: 28, margin: '0 auto',
                  background: 'linear-gradient(135deg, rgba(220,190,150,0.7), rgba(140,100,60,0.6))',
                  borderRadius: '3px 3px 1px 1px',
                  border: '1px solid rgba(184,150,110,0.5)',
                  boxShadow: '0 4px 20px rgba(184,150,110,0.2)',
                }}
              />
              <motion.div
                animate={{ y: [0, -12, 0], rotate: [3, -1, 3] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', top: 60, left: -80,
                  width: 60, height: 110,
                  background: 'linear-gradient(155deg, rgba(184,150,110,0.25), rgba(80,55,30,0.2))',
                  borderRadius: '35% 35% 25% 25% / 18% 18% 35% 35%',
                  border: '1px solid rgba(184,150,110,0.18)',
                }}
              />
              <motion.div
                animate={{ y: [0, -18, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 9, delay: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', top: 80, right: -65,
                  width: 45, height: 90,
                  background: 'linear-gradient(155deg, rgba(184,150,110,0.2), rgba(80,55,30,0.15))',
                  borderRadius: '35% 35% 25% 25% / 18% 18% 35% 35%',
                  border: '1px solid rgba(184,150,110,0.14)',
                }}
              />
            </div>
          </>
        )}

        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#120F0C] pointer-events-none" />
        <div className="absolute top-0 bottom-0 left-0 w-20 bg-gradient-to-r from-[#120F0C] pointer-events-none" />
      </div>

      {/* Divider */}
      <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px pointer-events-none"
           style={{ background: 'linear-gradient(to bottom, transparent, rgba(184,150,110,0.15) 30%, rgba(184,150,110,0.15) 70%, transparent)' }}
      />

      {/* Scroll hint */}
      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-35 pointer-events-none">
        <p className="font-sans text-[9px] text-[#F4EFE8]">مرر</p>
        <div className="w-px h-8 bg-[#F4EFE8]" />
      </div>
    </div>
  )
}
