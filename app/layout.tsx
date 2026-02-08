import type { Metadata } from 'next'
import './globals.css'
import Layout from './components/Layout'

export const metadata: Metadata = {
  title: 'IKIM Health - Healthcare Management Platform',
  description: 'Healthcare management demo built with Next.js and a FHIR-based API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  )
}


