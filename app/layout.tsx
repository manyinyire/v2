import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { MainLayout } from '@/components/Layout/MainLayout'
import { headers } from 'next/headers'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Escalated Query Management System',
  description: 'A system for managing and tracking escalated queries across different business units',
}

// This layout will not be used for /auth/* routes since they have their own layout
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the current path
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || '/'
  const isAuthPage = pathname.startsWith('/auth/')

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {isAuthPage ? (
            children
          ) : (
            <MainLayout>
              {children}
            </MainLayout>
          )}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}