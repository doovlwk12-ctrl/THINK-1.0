'use client'

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react'

interface ProfileDisplayNameContextValue {
  displayName: string | null
  setDisplayName: (name: string | null) => void
}

const ProfileDisplayNameContext = createContext<ProfileDisplayNameContextValue | null>(null)

export function useProfileDisplayName(): ProfileDisplayNameContextValue {
  const ctx = useContext(ProfileDisplayNameContext)
  if (!ctx) {
    return {
      displayName: null,
      setDisplayName: () => {},
    }
  }
  return ctx
}

export function ProfileDisplayNameProvider({ children }: { children: ReactNode }) {
  const [displayName, setDisplayNameState] = useState<string | null>(null)
  const setDisplayName = useCallback((name: string | null) => {
    setDisplayNameState(name)
  }, [])
  const value: ProfileDisplayNameContextValue = { displayName, setDisplayName }
  return (
    <ProfileDisplayNameContext.Provider value={value}>
      {children}
    </ProfileDisplayNameContext.Provider>
  )
}
