'use client'

import { useEffect, useState } from 'react'

function applyThemeSync() {
  if (typeof window === 'undefined') return
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark')
  } else if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    applyThemeSync()
  }, [])

  useEffect(() => {
    if (!mounted) return
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') applyThemeSync()
    }
    const handleThemeChange = () => applyThemeSync()
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('themechange', handleThemeChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('themechange', handleThemeChange)
    }
  }, [mounted])

  return <>{children}</>
}
