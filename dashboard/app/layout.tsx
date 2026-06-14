import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'IG Leads',
  description: 'Dashboard de leads de Instagram',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-cream dark:bg-navy-dark min-h-screen transition-colors">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
