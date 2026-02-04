'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  // Function to apply theme
  const applyTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  useEffect(() => {
    setMounted(true)
    applyTheme()
  }, [])

  // Re-apply theme when pathname changes (navigation)
  useEffect(() => {
    if (mounted) {
      applyTheme()
    }
  }, [pathname, mounted])

  // Listen for storage changes and custom theme change events
  useEffect(() => {
    if (!mounted) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        applyTheme()
      }
    }

    const handleThemeChange = () => {
      applyTheme()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('themechange', handleThemeChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('themechange', handleThemeChange)
    }
  }, [mounted])

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>
  }

  return <>{children}</>
}
