import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Asset Pulse',
  description: 'Real-time prices and insights for Bitcoin, Gold, and Silver',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
