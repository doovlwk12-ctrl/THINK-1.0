'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useProfileDisplayName } from '@/components/providers/ProfileDisplayNameProvider'
import { apiClient } from '@/lib/api'
import dynamic from 'next/dynamic'
import { Button } from '@/components/shared/Button'
import { User, Home, Package, HelpCircle, LayoutDashboard, Menu, X } from 'lucide-react'
import { UserMenu } from './UserMenu'
import { ThemeToggle } from './ThemeToggle'

// Lazy load NotificationBell
const NotificationBell = dynamic(() => import('@/components/notifications/NotificationBell').then(mod => ({ default: mod.NotificationBell })), {
  ssr: false,
  loading: () => <div className="w-10 h-10" />,
})

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, status: authStatus, signOut } = useAuth()
  const { displayName, setDisplayName } = useProfileDisplayName()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [currentHash, setCurrentHash] = useState('')

  // Sync display name from profile API when user is logged in (so dropdown shows correct name)
  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    apiClient.get<{ success: boolean; user?: { name: string } }>('/users/profile').then((res) => {
      if (cancelled || !res?.success || !res?.user?.name) return
      setDisplayName(res.user.name)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [session?.user?.id, setDisplayName])

  // Track hash changes
  useEffect(() => {
    const updateHash = () => {
      setCurrentHash(window.location.hash)
    }
    
    updateHash() // Initial hash
    window.addEventListener('hashchange', updateHash)
    
    return () => {
      window.removeEventListener('hashchange', updateHash)
    }
  }, [pathname])

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])


  const handleHomeClick = () => {
    // Allow navigation to home page
  }

  const handleFAQClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setMobileMenuOpen(false) // Close mobile menu
    
    // Navigate to home page with FAQ hash
    router.push('/#faq')
    
    // Scroll to FAQ after navigation
    setTimeout(() => {
      const faqElement = document.getElementById('faq')
      if (faqElement) {
        faqElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 300)
  }
  
  const handlePackagesClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    setMobileMenuOpen(false) // Close mobile menu
    
    // Navigate to home page with packages hash
    router.push('/#packages')
    
    // Scroll to packages after navigation
    setTimeout(() => {
      const packagesElement = document.getElementById('packages')
      if (packagesElement) {
        packagesElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 300)
  }


  // Check if current path matches navigation item
  const isActive = (path: string, hash?: string) => {
    if (path === '/') {
      // For home page, check if we're on root and optionally check hash
      if (hash) {
        const currentHash = typeof window !== 'undefined' ? window.location.hash : ''
        return pathname === '/' && currentHash === hash
      }
      return pathname === '/'
    }
    return pathname?.startsWith(path)
  }

  const navigationItems = [
    { href: '/', label: 'الصفحة الرئيسية', icon: Home, onClick: handleHomeClick },
    { href: '/#packages', label: 'الباقات', icon: Package, onClick: handlePackagesClick },
    { href: '/#faq', label: 'الأسئلة الشائعة', icon: HelpCircle, onClick: handleFAQClick },
  ]

  return (
    <header className={`relative bg-gradient-to-b from-cream via-cream to-greige/10 dark:from-charcoal-900 dark:via-charcoal-800 dark:to-charcoal-800 shadow-sm border-b-2 border-greige/30 dark:border-charcoal-600 sticky top-0 z-50 transition-all ${isScrolled ? 'shadow-md dark:shadow-charcoal-900/50' : ''}`}>
      {/* Blueprint decorative lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rocky-blue/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-gray/30 to-transparent" />
      </div>
      
      <div className="container mx-auto px-4 py-4 relative z-10">
        <div className="flex justify-between items-center">
          {/* Logo — تصميم أوضح وأنسب */}
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-xl px-3 py-2 -mx-1 text-rocky-blue dark:text-rocky-blue-300 hover:text-rocky-blue-600 dark:hover:text-rocky-blue-400 hover:bg-rocky-blue/5 dark:hover:bg-rocky-blue/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2 focus:ring-offset-cream dark:focus:ring-offset-charcoal-900"
            onClick={handleHomeClick}
            aria-label="منصة فكرة - الصفحة الرئيسية"
          >
            {/* أيقونة مخطط أرضي — أوضح وأنسب */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-rocky-blue/10 dark:bg-rocky-blue/20 border border-rocky-blue/20 dark:border-rocky-blue-400/30 flex items-center justify-center group-hover:bg-rocky-blue/15 dark:group-hover:bg-rocky-blue/25 group-hover:border-rocky-blue/30 dark:group-hover:border-rocky-blue-400/40 transition-colors duration-300">
              <svg className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {/* إطار المخطط */}
                <rect x="4" y="4" width="16" height="16" rx="0.5" />
                {/* جدران داخلية — تخطيط أرضي */}
                <path d="M4 12h16M12 4v16" />
                {/* فتحة باب صغيرة */}
                <path d="M11 12h2" strokeWidth="1.5" />
              </svg>
            </div>
            {/* النص */}
            <div className="flex flex-col items-start justify-center">
              <span className="text-lg sm:text-xl font-black tracking-tight leading-tight text-charcoal dark:text-cream group-hover:text-rocky-blue dark:group-hover:text-rocky-blue-300 transition-colors duration-300">
                منصة <span className="text-rocky-blue dark:text-rocky-blue-300">فكرة</span>
              </span>
              <span className="text-[10px] sm:text-xs font-medium text-blue-gray dark:text-greige tracking-wider mt-0.5">
                التخطيط المعماري
              </span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2" aria-label="التنقل الرئيسي">
            {navigationItems.map((item) => {
              const Icon = item.icon
              // Check if link is active based on pathname and hash
              let active = false
              if (item.href === '/') {
                active = pathname === '/' && (!currentHash || currentHash === '')
              } else if (item.href === '/#packages') {
                active = pathname === '/' && currentHash === '#packages'
              } else if (item.href === '/#faq') {
                active = pathname === '/' && currentHash === '#faq'
              } else {
                active = pathname?.startsWith(item.href) || false
              }
              
              return (
                <Link 
                  key={item.href} 
                  href={item.href} 
                  onClick={item.onClick}
                  className={`group relative flex items-center justify-center gap-2 px-4 py-2 rounded-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2 ${
                    active 
                      ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 border-2 border-rocky-blue/40 dark:border-rocky-blue-600 font-bold shadow-sm' 
                      : 'text-charcoal dark:text-cream hover:bg-greige/15 dark:hover:bg-charcoal-700 border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-500/40'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Architectural corner decorations */}
                  {active && (
                    <>
                      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-rocky-blue/50 dark:border-rocky-blue-400" />
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-rocky-blue/50 dark:border-rocky-blue-400" />
                    </>
                  )}
                  <Icon className={`w-4 h-4 relative z-10 ${active ? 'text-rocky-blue dark:text-rocky-blue-300' : ''}`} />
                  <span className="text-sm font-bold relative z-10">{item.label}</span>
                </Link>
              )
            })}
            
            {session && (
              <Link 
                href={
                  session.user.role === 'ADMIN' ? '/admin/dashboard' :
                  session.user.role === 'ENGINEER' ? '/engineer/dashboard' : 
                  '/dashboard'
                }
                className={`group relative flex items-center justify-center gap-2 px-4 py-2 rounded-none transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2 ${
                  isActive('/dashboard') || isActive('/engineer/dashboard') || isActive('/admin/dashboard')
                    ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 border-2 border-rocky-blue/40 dark:border-rocky-blue-600 font-bold shadow-sm'
                    : 'text-charcoal dark:text-cream hover:bg-greige/15 dark:hover:bg-charcoal-700 border-2 border-transparent hover:border-rocky-blue/30 dark:hover:border-rocky-blue-500/40'
                }`}
                aria-current={isActive('/dashboard') || isActive('/engineer/dashboard') || isActive('/admin/dashboard') ? 'page' : undefined}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {session.user.role === 'ADMIN' ? 'لوحة تحكم الإدارة' : session.user.role === 'ENGINEER' ? 'لوحة تحكم المهندس' : 'لوحة التحكم'}
                </span>
              </Link>
            )}
          </nav>
          
          {/* User Actions — تباعد كافٍ على الجوال لمنع تداخل الأيقونات */}
          <div className="flex items-center gap-3 ms-4 sm:ms-6 md:ms-8">
            <ThemeToggle />
            {session && (
              <>
                <NotificationBell />
                <UserMenu
                  userName={session.user.name ?? 'مستخدم'}
                  userRole={session.user.role ?? 'CLIENT'}
                  onSignOut={signOut}
                />
              </>
            )}
            
            {authStatus === 'loading' && (
              <div className="w-10 h-10 rounded-lg bg-greige/20 dark:bg-charcoal-600 animate-pulse" aria-hidden />
            )}
            {authStatus !== 'loading' && !session && (
              <div className="flex gap-3">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                    تسجيل الدخول
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
                    إنشاء حساب
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button — حجم لمس مناسب للجوال */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg touch-target min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center hover:bg-greige/10 dark:hover:bg-charcoal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2 text-charcoal dark:text-cream"
              aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <nav 
            className="md:hidden mt-4 pb-4 border-t border-greige/20 dark:border-charcoal-600 pt-4 animate-in slide-in-from-top-2"
            aria-label="قائمة التنقل للجوال"
          >
            <div className="flex flex-col gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                // Check if link is active based on pathname and hash
                let active = false
                if (item.href === '/') {
                  active = pathname === '/' && (!currentHash || currentHash === '')
                } else if (item.href === '/#packages') {
                  active = pathname === '/' && currentHash === '#packages'
                } else if (item.href === '/#faq') {
                  active = pathname === '/' && currentHash === '#faq'
                } else {
                  active = pathname?.startsWith(item.href) || false
                }
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      item.onClick(e)
                      setMobileMenuOpen(false)
                    }}
                    className={`flex items-center gap-3 px-4 py-3 min-h-[2.75rem] rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2 ${
                      active
                        ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 border-2 border-rocky-blue/30 dark:border-rocky-blue-600 font-medium shadow-sm'
                        : 'text-charcoal dark:text-cream hover:bg-greige/10 dark:hover:bg-charcoal-700 border-2 border-transparent hover:border-greige/20 dark:hover:border-charcoal-600'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
              
              {session && (
                <Link
                  href={session.user.role === 'ENGINEER' || session.user.role === 'ADMIN' ? '/engineer/dashboard' : '/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 min-h-[2.75rem] rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2 ${
                    isActive('/dashboard') || isActive('/engineer/dashboard')
                      ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 border-2 border-rocky-blue/30 dark:border-rocky-blue-600 font-medium shadow-sm'
                      : 'text-charcoal dark:text-cream hover:bg-greige/10 dark:hover:bg-charcoal-700 border-2 border-transparent hover:border-greige/20 dark:hover:border-charcoal-600'
                  }`}
                  aria-current={isActive('/dashboard') || isActive('/engineer/dashboard') ? 'page' : undefined}
                >
                  <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{session.user.role === 'ADMIN' ? 'لوحة تحكم الإدارة' : session.user.role === 'ENGINEER' ? 'لوحة تحكم المهندس' : 'لوحة التحكم'}</span>
                </Link>
              )}
              
              {session && (
                <>
                  {/* Account Settings Link */}
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 min-h-[2.75rem] rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2 ${
                      isActive('/dashboard/profile')
                        ? 'bg-rocky-blue/10 dark:bg-rocky-blue/20 text-rocky-blue dark:text-rocky-blue-300 border-2 border-rocky-blue/30 dark:border-rocky-blue-600 font-medium'
                        : 'text-charcoal dark:text-cream hover:bg-greige/10 dark:hover:bg-charcoal-700 border-2 border-transparent hover:border-greige/20 dark:hover:border-charcoal-600'
                    }`}
                    aria-current={isActive('/dashboard/profile') ? 'page' : undefined}
                  >
                    <User className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">إعدادات الحساب</span>
                  </Link>
                  
                  <div className="mt-2 pt-2 border-t border-greige/20 dark:border-charcoal-600">
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="w-10 h-10 rounded-full bg-rocky-blue/10 dark:bg-rocky-blue/20 flex items-center justify-center border-2 border-rocky-blue/30">
                        <User className="w-5 h-5 text-rocky-blue dark:text-rocky-blue-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-charcoal dark:text-cream">{displayName ?? session.user.name ?? 'مستخدم'}</p>
                        <p className="text-xs text-blue-gray dark:text-greige">
                          {(session.user.role ?? 'CLIENT') === 'CLIENT' ? 'عميل' : session.user.role === 'ENGINEER' ? 'مهندس' : 'مدير'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
