'use client'

import useSWR from 'swr'
import { apiClient } from '@/lib/api'

export interface OrderSummary {
  id: string
  orderNumber: string
  status: string
  package: { nameAr: string; price: number }
  remainingRevisions: number
  deadline: string
  createdAt: string
}

interface MyOrdersResponse {
  orders: OrderSummary[]
}

const fetcher = async (): Promise<MyOrdersResponse> => {
  const result = await apiClient.get<{ success: boolean; orders: OrderSummary[] }>('/orders/my-orders')
  return { orders: result.orders }
}

const KEY = '/orders/my-orders'

/** Error with optional HTTP status (set by api.ts). */
type ApiError = Error & { status?: number }

/**
 * Client-side cached order list with SWR.
 * Revalidates on focus and can be invalidated via mutate() after order create/update.
 * Does not retry on 503 (service unavailable) to avoid console spam and repeated failed requests.
 */
export function useMyOrders(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MyOrdersResponse>(
    enabled ? KEY : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      revalidateOnReconnect: true,
      onErrorRetry(err, _key, _config, revalidate, { retryCount }) {
        if ((err as ApiError)?.status === 503) return
        if (retryCount >= 3) return
        setTimeout(() => revalidate({ retryCount }), 2000 * (retryCount + 1))
      },
    }
  )

  return {
    orders: data?.orders ?? [],
    error: error?.message ?? null,
    isLoading,
    mutate,
  }
}
