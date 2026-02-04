'use client'

import { useState, useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
      if (savedTheme) setTheme(savedTheme)
    }
    window.addEventListener('themechange', handleThemeChange)
    return () => window.removeEventListener('themechange', handleThemeChange)
  }, [mounted])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    // تطبيق فوري على DOM أولاً (بدون انتظار React)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', newTheme)
    setTheme(newTheme)
    window.dispatchEvent(new Event('themechange'))
  }

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl border-2 border-greige/30 dark:border-charcoal-600" aria-hidden />
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-greige/30 dark:border-charcoal-600 text-charcoal dark:text-cream hover:bg-greige/10 dark:hover:bg-charcoal-700 hover:border-rocky-blue/40 dark:hover:border-rocky-blue-500/40 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2"
      aria-label={theme === 'light' ? 'تفعيل الوضع الليلي' : 'تفعيل الوضع النهاري'}
      title={theme === 'light' ? 'النمط الليلي' : 'النمط النهاري'}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5" />
      ) : (
        <Sun className="w-5 h-5" />
      )}
    </button>
  )
}
