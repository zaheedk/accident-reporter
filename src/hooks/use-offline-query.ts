import { useQuery, UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getCached, setCache } from '@/lib/offline-cache';

/**
 * A wrapper around useQuery that:
 * 1. Seeds initialData from IndexedDB (offline cache) on first mount
 * 2. Persists every successful fetch back to IndexedDB
 *
 * This gives instant page loads from cache + background revalidation,
 * and works fully offline.
 */
export function useOfflineQuery<T>(
  options: UseQueryOptions<T, Error, T, string[]> & { queryKey: string[] }
) {
  const queryClient = useQueryClient();
  const cacheKey = options.queryKey.join(':');
  const [initialData, setInitialData] = useState<T | undefined>(undefined);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from IndexedDB once on mount
  useEffect(() => {
    getCached<T>(cacheKey).then((cached) => {
      if (cached !== undefined) {
        setInitialData(cached);
        queryClient.setQueryData(options.queryKey, cached);
      }
      setIsHydrated(true);
    });
  }, [cacheKey, queryClient, options.queryKey]);

  const query = useQuery<T, Error, T, string[]>({
    ...options,
    initialData: initialData,
    // 5-minute stale time so navigating back doesn't re-fetch
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    // Keep data in memory for 10 minutes even when unmounted
    gcTime: options.gcTime ?? 10 * 60 * 1000,
    // Retry once on failure (covers transient network issues)
    retry: options.retry ?? 1,
  });

  // Persist successful data to IndexedDB
  useEffect(() => {
    if (query.isSuccess && query.data !== undefined) {
      setCache(cacheKey, query.data);
    }
  }, [query.isSuccess, query.data, cacheKey]);

  return { ...query, isHydrated };
}
