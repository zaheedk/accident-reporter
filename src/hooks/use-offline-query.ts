import { useQuery, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { getCached, setCache } from '@/lib/offline-cache';

/**
 * useQuery wrapper with IndexedDB offline persistence.
 * - On mount, seeds QueryClient cache from IndexedDB if empty
 * - On every successful fetch, persists to IndexedDB
 * - Uses generous staleTime so back-navigation is instant
 */
export function useOfflineQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  opts?: { staleTime?: number; enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const seeded = useRef(false);
  const cacheKey = queryKey.join(':');

  // Seed from IndexedDB before the query runs
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const existing = queryClient.getQueryData(queryKey);
    if (existing !== undefined) return;
    getCached<T>(cacheKey).then((cached) => {
      if (cached !== undefined) {
        queryClient.setQueryData(queryKey, cached);
      }
    });
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useQuery<T, Error>({
    queryKey,
    queryFn,
    staleTime: opts?.staleTime ?? 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    enabled: opts?.enabled,
  });

  // Persist to IndexedDB on success
  useEffect(() => {
    if (query.isSuccess && query.data !== undefined) {
      setCache(cacheKey, query.data);
    }
  }, [query.isSuccess, query.data, cacheKey]);

  return query;
}
