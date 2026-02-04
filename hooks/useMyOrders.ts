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

/**
 * Client-side cached order list with SWR.
 * Revalidates on focus and can be invalidated via mutate() after order create/update.
 */
export function useMyOrders(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<MyOrdersResponse>(
    enabled ? KEY : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      revalidateOnReconnect: true,
    }
  )

  return {
    orders: data?.orders ?? [],
    error: error?.message ?? null,
    isLoading,
    mutate,
  }
}
