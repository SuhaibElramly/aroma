import type { Metadata } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'أروما — SMELL GOOD, FEEL GOOD',
    template: '%s | أروما',
  },
  description:
    'عطور مختارة بعناية من أرقى دور العطور في العالم. اكتشف العطور النادرة والروائح الفاخرة — بنغازي، ليبيا.',
  keywords: ['عطر', 'عطور', 'عود', 'نيش', 'عطور فاخرة', 'بنغازي', 'ليبيا', 'aromashop.ly'],
  openGraph: {
    title: 'أروما — SMELL GOOD, FEEL GOOD',
    description: 'عطور مختارة بعناية من أرقى دور العطور في العالم — بنغازي، ليبيا.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={ibmPlexArabic.variable}>
      <body className="font-sans bg-aroma-bg text-aroma-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
