'use client'

import React from 'react'
import { Button } from './shared/Button'
import { reportError } from '@/lib/reportError'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    reportError(error, { componentStack: errorInfo.componentStack })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md mx-auto p-6">
              <h1 className="text-2xl font-bold mb-4 text-gray-900">
                حدث خطأ ما
              </h1>
              <p className="text-gray-600 mb-6">
                نعتذر، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-sm font-mono text-red-800 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-40">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
              <div className="flex gap-4 justify-center">
                <Button onClick={() => window.location.reload()}>
                  إعادة تحميل الصفحة
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    this.setState({ hasError: false, error: undefined })
                    window.location.href = '/'
                  }}
                >
                  العودة للصفحة الرئيسية
                </Button>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
