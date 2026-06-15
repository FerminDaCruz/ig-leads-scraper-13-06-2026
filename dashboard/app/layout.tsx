import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Geist } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
})

export const metadata: Metadata = {
  title: 'IG Leads',
  description: 'Dashboard de leads de Instagram',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geist.variable} font-sans bg-cream dark:bg-navy-dark min-h-screen transition-colors`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
