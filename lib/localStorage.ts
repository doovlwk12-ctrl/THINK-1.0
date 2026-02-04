/**
 * LocalStorage utility for client-side storage
 * Safe wrapper around localStorage with error handling
 */

export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') {
      return defaultValue ?? null
    }

    try {
      const item = window.localStorage.getItem(key)
      if (item === null) {
        return defaultValue ?? null
      }
      return JSON.parse(item) as T
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return defaultValue ?? null
    }
  },

  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.clear()
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  },
}
