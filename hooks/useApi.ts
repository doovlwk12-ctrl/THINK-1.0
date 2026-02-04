import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface UseApiOptions<T = unknown> {
  onSuccess?: (data: T) => void
  onError?: (error: string) => void
  showSuccessToast?: boolean
  showErrorToast?: boolean
}

export function useApi<T = unknown>(options: UseApiOptions<T> = {}) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    onSuccess,
    onError,
    showSuccessToast = false,
    showErrorToast = true,
  } = options

  const execute = useCallback(async (
    apiCall: () => Promise<unknown>,
    successMessage?: string
  ) => {
    setLoading(true)
    setError(null)
    // Don't clear data immediately - keep previous data visible while loading new data
    // This prevents flash of empty state during navigation

    try {
      const result = await apiCall()

      // Check if result is a Response object (from fetch) or already parsed data (from apiClient)
      if (result instanceof Response) {
        const responseData = await result.json() as T
        if (result.ok) {
          setData(responseData)
          if (onSuccess) onSuccess(responseData)
          if (showSuccessToast && successMessage) {
            toast.success(successMessage)
          }
          return responseData
        } else {
          const errorData = responseData as { error?: string; message?: string }
          const errorMsg = errorData?.error || errorData?.message || 'حدث خطأ ما'
          setError(errorMsg)
          if (onError) onError(errorMsg)
          if (showErrorToast) {
            toast.error(errorMsg)
          }
          throw new Error(errorMsg)
        }
      } else {
        // Result is already parsed (from apiClient)
        // apiClient throws error if response.ok is false, so if we reach here, it's success
        const typedResult = result as T
        setData(typedResult)
        if (onSuccess) onSuccess(typedResult)
        if (showSuccessToast && successMessage) {
          toast.success(successMessage)
        }
        return typedResult
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'حدث خطأ ما'
      setError(errorMsg)
      if (onError) onError(errorMsg)
      if (showErrorToast) {
        toast.error(errorMsg)
      }
      throw err
    } finally {
      setLoading(false)
    }
  }, [onSuccess, onError, showSuccessToast, showErrorToast])

  return { execute, loading, data, error }
}
