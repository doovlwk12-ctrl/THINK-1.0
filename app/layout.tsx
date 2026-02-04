import type { Metadata, Viewport } from 'next'
import { Cairo } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ProfileDisplayNameProvider } from '@/components/providers/ProfileDisplayNameProvider'
import { ErrorBoundaryProvider } from '@/components/providers/ErrorBoundaryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#E0D8D0' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2023' },
  ],
}

const cairo = Cairo({ 
  subsets: ['arabic', 'latin'],
  display: 'swap',
  preload: true,
  variable: '--font-cairo',
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'منصة فكرة - التخطيط المعماري',
  description: 'منصة هندسية معمارية للتخطيط - ربط العملاء بالمهندسين المعماريين',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: '(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark");else if(t==="light")document.documentElement.classList.remove("dark");else if(window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark");}catch(e){}})();',
          }}
        />
      </head>
      <body className={cairo.className} suppressHydrationWarning>
        <ThemeProvider>
          <ErrorBoundaryProvider>
            <AuthProvider>
              <ProfileDisplayNameProvider>
                {children}
                <Toaster position="top-center" />
              </ProfileDisplayNameProvider>
            </AuthProvider>
          </ErrorBoundaryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
