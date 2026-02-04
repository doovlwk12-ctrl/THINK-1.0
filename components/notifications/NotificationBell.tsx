'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { formatDateTimeHijriMiladi } from '@/lib/utils'
import { Card } from '@/components/shared/Card'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  data?: {
    orderId?: string
    orderNumber?: string
    revisionId?: string
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const previousUnreadCountRef = useRef(0)
  const previousNotificationIdsRef = useRef<Set<string>>(new Set())

  const getNotificationLink = (notification: Notification) => {
    if (notification.data?.orderId) {
      // Route based on notification type
      if (notification.type === 'revision_requested') {
        // Link to revision page if revisionId exists
        if (notification.data.revisionId) {
          return `/engineer/orders/${notification.data.orderId}/revision/${notification.data.revisionId}`
        }
        return `/engineer/orders/${notification.data.orderId}`
      }
      if (notification.type === 'message_received') {
        return `/orders/${notification.data.orderId}/chat`
      }
      return `/orders/${notification.data.orderId}`
    }
    return '#'
  }

  const fetchNotifications = useCallback(async () => {
    try {
      const result = await apiClient.get<{
        success: boolean
        notifications: Notification[]
        unreadCount: number
      }>('/notifications?limit=10&unreadOnly=false')
      
      if (result.success) {
        const previousIds = previousNotificationIdsRef.current
        const currentIds = new Set(result.notifications.map(n => n.id))
        
        // Detect new notifications (only on subsequent fetches, not initial load)
        if (previousIds.size > 0) {
          const newNotifications = result.notifications.filter(
            n => !previousIds.has(n.id) && !n.isRead
          )
          
          // Show toast for new notifications
          newNotifications.forEach((notification) => {
            const notificationLink = getNotificationLink(notification)
            toast.success(
              (t) => (
                <div 
                  onClick={() => {
                    toast.dismiss(t.id)
                    if (notificationLink !== '#') {
                      window.location.href = notificationLink
                    }
                  }}
                  className="flex flex-col gap-1 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="font-semibold text-sm">{notification.title}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{notification.message}</div>
                </div>
              ),
              {
                duration: 6000,
                icon: '🔔',
                position: 'top-center',
              }
            )
          })
        }
        
        // Update refs
        previousNotificationIdsRef.current = currentIds
        previousUnreadCountRef.current = result.unreadCount
        
        setNotifications(result.notifications)
        setUnreadCount(result.unreadCount)
      }
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Poll for new notifications every 10 seconds (more frequent for better UX)
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = async (notificationIds: string[]) => {
    try {
      await apiClient.put('/notifications', { notificationIds })
      setNotifications(notifications.map(n => 
        notificationIds.includes(n.id) ? { ...n, isRead: true } : n
      ))
      setUnreadCount(Math.max(0, unreadCount - notificationIds.length))
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowDropdown(!showDropdown)
          if (!showDropdown && unreadCount > 0) {
            const unreadIds = notifications
              .filter(n => !n.isRead)
              .slice(0, 10)
              .map(n => n.id)
            if (unreadIds.length > 0) {
              markAsRead(unreadIds)
            }
          }
        }}
        className="group relative flex items-center justify-center w-10 h-10 rounded-xl border-2 border-rocky-blue dark:border-rocky-blue-400 text-rocky-blue dark:text-rocky-blue-300 hover:bg-rocky-blue hover:text-cream dark:hover:bg-rocky-blue-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rocky-blue focus:ring-offset-2"
        aria-label={`الإشعارات${unreadCount > 0 ? ` (${unreadCount} غير مقروء)` : ''}`}
        aria-expanded={showDropdown}
      >
        {/* Architectural corner decoration */}
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-rocky-blue/40 dark:border-rocky-blue-400/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-rocky-blue/40 dark:border-rocky-blue-400/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <Bell className="w-5 h-5 relative z-10" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 dark:bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-black shadow-lg border-2 border-cream dark:border-charcoal-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <Card className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-sm max-h-[calc(100vh-6rem)] sm:max-h-96 overflow-hidden z-20 shadow-xl dark:shadow-gray-900/50 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">الإشعارات</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    const unreadIds = notifications
                      .filter(n => !n.isRead)
                      .map(n => n.id)
                    if (unreadIds.length > 0) {
                      markAsRead(unreadIds)
                    }
                  }}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-colors"
                >
                  تعليم الكل كمقروء
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                  لا توجد إشعارات
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={getNotificationLink(notification)}
                      onClick={() => {
                        if (!notification.isRead) {
                          markAsRead([notification.id])
                        }
                        setShowDropdown(false)
                      }}
                      className={`block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        !notification.isRead 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-r-primary-500 dark:border-r-primary-400' 
                          : ''
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <p className={`font-semibold text-sm flex-1 ${
                              !notification.isRead 
                                ? 'text-gray-900 dark:text-gray-100' 
                                : 'text-gray-800 dark:text-gray-200'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary-500 dark:bg-primary-400 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 overflow-hidden text-ellipsis" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {formatDateTimeHijriMiladi(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center flex-shrink-0">
                <Link
                  href="/notifications"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-colors font-medium"
                  onClick={() => setShowDropdown(false)}
                >
                  عرض جميع الإشعارات
                </Link>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
