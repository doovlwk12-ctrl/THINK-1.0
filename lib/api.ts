const API_BASE = '/api'
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

function getApiUrl(endpoint: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${API_BASE}${endpoint}`
  }
  return `${API_BASE}${endpoint}`
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function api<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const url = getApiUrl(endpoint)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  let response: Response
  try {
    const controller = new AbortController()
    // 60s timeout to tolerate Render free-tier cold start (~50s)
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    try {
      response = await fetch(url, {
        ...options,
        signal: controller.signal,
        credentials: 'include',
        headers,
        // عدم استخدام الكاش عند التنقّل لظهور أحدث التحديثات
        ...(options.method === 'GET' || !options.method ? { cache: 'no-store' as RequestCache } : {}),
      })
      clearTimeout(timeoutId)
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        throw new Error('انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.')
      }
      throw fetchErr
    }
  } catch (fetchError: unknown) {
    
    // Retry logic for network errors
    if (retryCount < MAX_RETRIES && fetchError instanceof Error) {
      const isNetworkError = 
        fetchError.message.includes('Failed to fetch') ||
        fetchError.message.includes('NetworkError') ||
        fetchError.name === 'TypeError'
      
      if (isNetworkError) {
        await delay(RETRY_DELAY * (retryCount + 1)) // Exponential backoff
        return api<T>(endpoint, options, retryCount + 1)
      }
    }
    
    throw new Error(`فشل الاتصال بالخادم: ${fetchError instanceof Error ? fetchError.message : 'خطأ غير معروف'}`)
  }

  let data: unknown
  try {
    const text = await response.text()
    if (!text) {
      // Empty response
      if (!response.ok) {
        throw new Error('استجابة فارغة من الخادم')
      }
      return {} as T
    }
    data = JSON.parse(text) as unknown
  } catch {
    // If response is not JSON, try to get error message from status
    if (!response.ok) {
      const errorMessage = response.status === 401 
        ? 'غير مصرح - يرجى تسجيل الدخول'
        : response.status === 403
        ? 'غير مصرح'
        : response.status === 404
        ? 'غير موجود'
        : response.status === 503
        ? 'تعذر الاتصال بقاعدة البيانات. يرجى المحاولة لاحقاً.'
        : response.status >= 500
        ? 'خطأ في الخادم'
        : 'فشل تحليل استجابة الخادم'
      const err = new Error(errorMessage) as Error & { status?: number }
      err.status = response.status
      throw err
    }
    throw new Error('فشل تحليل استجابة الخادم')
  }

  if (!response.ok) {
    const errorData = data as { error?: string; message?: string }
    const errorMessage = errorData?.error || errorData?.message || 'حدث خطأ ما'
    const err = new Error(errorMessage) as Error & { status?: number }
    err.status = response.status
    throw err
  }

  return data as T
}

/** POST FormData (e.g. file upload) with auth. Do not set Content-Type; browser sets it with boundary. */
export async function apiPostFormData<T = unknown>(endpoint: string, formData: FormData): Promise<T> {
  const url = getApiUrl(endpoint)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      credentials: 'include',
    })
  } finally {
    clearTimeout(timeoutId)
  }
  const text = await response.text()
  let data: unknown
  try {
    data = text ? (JSON.parse(text) as unknown) : {}
  } catch {
    if (!response.ok) {
      const msg = response.status === 401 ? 'غير مصرح - يرجى تسجيل الدخول' : response.status === 403 ? 'غير مصرح' : 'فشل تحليل استجابة الخادم'
      throw new Error(msg)
    }
    throw new Error('فشل تحليل استجابة الخادم')
  }
  if (!response.ok) {
    const errorData = data as { error?: string; message?: string }
    throw new Error(errorData?.error || errorData?.message || 'حدث خطأ ما')
  }
  return data as T
}

// Helper functions
export const apiClient = {
  get: <T = unknown>(endpoint: string) => api<T>(endpoint, { method: 'GET' }),
  post: <T = unknown>(endpoint: string, body?: unknown) =>
    api<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  postFormData: <T = unknown>(endpoint: string, formData: FormData) => apiPostFormData<T>(endpoint, formData),
  put: <T = unknown>(endpoint: string, body?: unknown) =>
    api<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: <T = unknown>(endpoint: string) =>
    api<T>(endpoint, { method: 'DELETE' }),
}
