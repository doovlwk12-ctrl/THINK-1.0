'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'

export function ErrorBoundaryProvider({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
