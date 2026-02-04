'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { User, Settings, LogOut, Moon, Sun, Globe, ChevronDown, LayoutDashboard } from 'lucide-react'
import { useProfileDisplayName } from '@/components/providers/ProfileDisplayNameProvider'

interface UserMenuProps {
  userName: string
  userRole: string
  /** When provided, used instead of NextAuth signOut */
  onSignOut?: () => Promise<void>
}

export function UserMenu({ userName, userRole, onSignOut }: UserMenuProps) {
  const { displayName } = useProfileDisplayName()
  const nameToShow = displayName ?? userName ?? 'مستخدم'
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const menuRef = useRef<HTMLDivElement>(null)

  // Load theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
      // ThemeProvider will handle applying it, but we sync here for consistency
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const initialTheme = prefersDark ? 'dark' : 'light'
      setTheme(initialTheme)
      // ThemeProvider will handle applying it, but we sync here for consistency
      if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', newTheme)
    setTheme(newTheme)
    window.dispatchEvent(new Event('themechange'))
  }

  const handleSignOut = async () => {
    try {
      if (onSignOut) {
        await onSignOut()
        router.push('/login')
      } else {
        await signOut({ callbackUrl: '/login' })
      }
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const isActive = (path: string) => {
    if (path === '/dashboard/profile') {
      return pathname === '/dashboard/profile'
    }
    if (path === '/dashboard' || path === '/engineer/dashboard') {
      return pathname === '/dashboard' || pathname === '/engineer/dashboard' || pathname?.startsWith('/admin/dashboard')
    }
    return pathname === path || pathname?.startsWith(path)
  }

  const getDashboardPath = () => {
    if (userRole === 'ADMIN') {
      return '/admin/dashboard'
    }
    if (userRole === 'ENGINEER') {
      return '/engineer/dashboard'
    }
    return '/dashboard'
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button - Enhanced */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2 px-4 py-2 min-h-[2.75rem] rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2 touch-target ${
          isActive('/dashboard') || isActive('/dashboard/profile') || isActive('/engineer/dashboard')
            ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 border-2 border-rocky-blue/30 dark:border-rocky-blue-500/40 shadow-sm'
            : 'bg-greige/20 dark:bg-charcoal-700 text-charcoal dark:text-cream hover:bg-greige/30 dark:hover:bg-charcoal-600 border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-500/40'
        }`}
        aria-label="قائمة المستخدم"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
          isActive('/dashboard') || isActive('/dashboard/profile') || isActive('/engineer/dashboard')
            ? 'bg-rocky-blue dark:bg-rocky-blue-600 text-cream'
            : 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 group-hover:bg-rocky-blue/20 dark:group-hover:bg-rocky-blue/30'
        }`}>
          <User className="w-5 h-5" />
        </div>
        <span className="text-sm font-bold hidden sm:inline">ملف شخصي</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu - Enhanced */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 bg-white dark:bg-charcoal-800 rounded-2xl shadow-2xl border-2 border-greige/30 dark:border-charcoal-600 py-2 z-50 animate-in slide-in-from-top-2 overflow-hidden">
          {/* User Info - Enhanced */}
          <div className="px-5 py-4 border-b-2 border-greige/30 dark:border-charcoal-600 bg-gradient-to-r from-rocky-blue/5 to-blue-gray/5 dark:from-rocky-blue/10 dark:to-blue-gray/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rocky-blue to-rocky-blue-600 dark:from-rocky-blue-600 dark:to-rocky-blue-700 flex items-center justify-center shadow-lg border-2 border-cream dark:border-charcoal-900">
                <User className="w-6 h-6 text-cream" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-charcoal dark:text-cream truncate">
                  {nameToShow}
                </p>
                <div className="inline-block mt-1 bg-rocky-blue/10 dark:bg-rocky-blue/20 px-2 py-0.5 rounded-full">
                  <p className="text-xs font-bold text-rocky-blue dark:text-rocky-blue-300">
                    {userRole === 'CLIENT' ? 'عميل' : userRole === 'ENGINEER' ? 'مهندس' : 'مدير'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Dashboard Link */}
            <Link
              href={getDashboardPath()}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-lg mx-2 ${
                isActive('/dashboard') || isActive('/engineer/dashboard') || isActive('/admin/dashboard')
                  ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 border-2 border-rocky-blue/30 dark:border-rocky-blue-500/40'
                  : 'text-charcoal dark:text-cream hover:bg-greige/20 dark:hover:bg-charcoal-700 hover:text-rocky-blue dark:hover:text-rocky-blue-300'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>{userRole === 'ADMIN' ? 'لوحة تحكم الإدارة' : userRole === 'ENGINEER' ? 'لوحة تحكم المهندس' : 'لوحة التحكم'}</span>
            </Link>
            
            {/* Admin-specific links */}
            {userRole === 'ADMIN' && (
              <>
                <div className="px-4 py-2 border-t-2 border-greige/30 dark:border-charcoal-600 mt-1">
                  <p className="text-xs font-black text-rocky-blue dark:text-rocky-blue-300 mb-2 px-2">
                    إدارة المنصة
                  </p>
                  <Link
                    href="/admin/packages"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-2 py-2 text-sm text-charcoal dark:text-cream hover:bg-greige/20 dark:hover:bg-charcoal-700 rounded-lg transition-all duration-300 hover:text-rocky-blue dark:hover:text-rocky-blue-300"
                  >
                    <span className="flex-1 text-right font-medium">إدارة الباقات</span>
                  </Link>
                  <Link
                    href="/admin/orders"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-2 py-2 text-sm text-charcoal dark:text-cream hover:bg-greige/20 dark:hover:bg-charcoal-700 rounded-lg transition-all duration-300 hover:text-rocky-blue dark:hover:text-rocky-blue-300"
                  >
                    <span className="flex-1 text-right font-medium">جميع الطلبات</span>
                  </Link>
                  <Link
                    href="/admin/engineers"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-2 py-2 text-sm text-charcoal dark:text-cream hover:bg-greige/20 dark:hover:bg-charcoal-700 rounded-lg transition-all duration-300 hover:text-rocky-blue dark:hover:text-rocky-blue-300"
                  >
                    <span className="flex-1 text-right font-medium">إدارة المهندسين</span>
                  </Link>
                </div>
              </>
            )}

            {/* Account Settings */}
            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-lg mx-2 ${
                isActive('/dashboard/profile')
                  ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 border-2 border-rocky-blue/30 dark:border-rocky-blue-500/40'
                  : 'text-charcoal dark:text-cream hover:bg-greige/20 dark:hover:bg-charcoal-700 hover:text-rocky-blue dark:hover:text-rocky-blue-300'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>إعدادات الحساب</span>
            </Link>

            {/* Page Settings */}
            <div className="px-4 py-2 border-t-2 border-greige/30 dark:border-charcoal-600 mt-1">
              <p className="text-xs font-black text-rocky-blue dark:text-rocky-blue-300 mb-2 px-2">
                إعدادات الصفحة
              </p>
              
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-2 py-2.5 text-sm font-medium text-charcoal dark:text-cream hover:bg-greige/20 dark:hover:bg-charcoal-700 rounded-lg transition-all duration-300 hover:text-rocky-blue dark:hover:text-rocky-blue-300"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
                <span className="flex-1 text-right">
                  {theme === 'light' ? 'النمط الليلي' : 'النمط النهاري'}
                </span>
              </button>

              {/* Language (Placeholder for future implementation) */}
              <button
                disabled
                className="w-full flex items-center gap-3 px-2 py-2.5 text-sm text-blue-gray dark:text-greige rounded-lg cursor-not-allowed opacity-50"
                title="قريباً"
              >
                <Globe className="w-5 h-5" />
                <span className="flex-1 text-right font-medium">اللغة</span>
                <span className="text-xs bg-greige/30 dark:bg-charcoal-700 px-2 py-0.5 rounded-full">
                  قريباً
                </span>
              </button>
            </div>

            {/* Sign Out */}
            <div className="border-t-2 border-greige/30 dark:border-charcoal-600 mt-1 pt-1">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-300 rounded-lg mx-2"
              >
                <LogOut className="w-5 h-5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
