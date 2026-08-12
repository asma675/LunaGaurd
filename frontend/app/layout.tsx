import type { Metadata } from 'next'
import './globals.css'
import AppShell from '@/components/layout/AppShell'

export const metadata: Metadata = {
  title: 'LunaGuard | Explainable Lunar Mission Intelligence',
  description: 'IBM watsonx and Granite-powered decision support for resilient lunar rover missions.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
