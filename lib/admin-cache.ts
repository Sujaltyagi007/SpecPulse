'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isDirty: boolean;
}

const tabCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

export function getCachedTabData<T>(key: string): T | null {
  const entry = tabCache.get(key);
  if (entry && !entry.isDirty) {
    return entry.data as T;
  }
  return null;
}

export function setCachedTabData<T>(key: string, data: T): void {
  tabCache.set(key, {
    data,
    timestamp: Date.now(),
    isDirty: false,
  });
}

export function markTabDirty(key: string): void {
  const entry = tabCache.get(key);
  if (entry) {
    entry.isDirty = true;
  }
}

export function markAllTabsDirty(): void {
  for (const entry of tabCache.values()) {
    entry.isDirty = true;
  }
}

export function updateCachedTabData<T>(key: string, updater: (prev: T) => T): void {
  const entry = tabCache.get(key);
  if (entry) {
    entry.data = updater(entry.data);
    entry.isDirty = false;
  }
}

export function useTabData<T>(tabKey: string, fetcher: () => Promise<T>, options?: { ttlMs?: number; initialData?: T; }) {
  const ttlMs = options?.ttlMs ?? 5 * 60 * 1000;
  const cached = tabCache.get(tabKey);
  const initialData = cached && !cached.isDirty && Date.now() - cached.timestamp < ttlMs ? (cached.data as T) : options?.initialData ?? null;
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      if (inFlightRequests.has(tabKey)) {
        try {
          const res = await inFlightRequests.get(tabKey);
          if (isMountedRef.current) {
            setData(res);
            setIsLoading(false);
            setIsRefreshing(false);
          }
          return res;
        } catch (err: any) {
          if (isMountedRef.current) {
            setError(err.message || 'Failed to load data');
            setIsLoading(false);
            setIsRefreshing(false);
          }
          return null;
        }
      }
      if (isManualRefresh) { setIsRefreshing(true); }
      else if (!data) { setIsLoading(true); }
      setError(null);

      const requestPromise = fetcher().then((result) => {
        setCachedTabData(tabKey, result);
        inFlightRequests.delete(tabKey);
        return result;
      }).catch((err) => {
        inFlightRequests.delete(tabKey);
        throw err;
      });

      inFlightRequests.set(tabKey, requestPromise);

      try {
        const result = await requestPromise;
        if (isMountedRef.current) {
          setData(result);
          setIsLoading(false);
          setIsRefreshing(false);
        }
        return result;
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err.message || 'An error occurred while loading data');
          setIsLoading(false);
          setIsRefreshing(false);
        }
        return null;
      }
    }, [tabKey, fetcher, data]
  );

  useEffect(() => {
    isMountedRef.current = true;
    const currentEntry = tabCache.get(tabKey);
    const isStale = !currentEntry || currentEntry.isDirty || Date.now() - currentEntry.timestamp >= ttlMs;
    if (isStale) fetchData(false);
    else if (currentEntry && currentEntry.data !== data) {
      setData(currentEntry.data as T);
      setIsLoading(false);
    }
    return () => { isMountedRef.current = false };
  }, [tabKey, fetchData, ttlMs]);

  const updateData = useCallback((updater: (prev: T | null) => T) => {
    setData((prev) => {
      const next = updater(prev);
      setCachedTabData(tabKey, next);
      return next;
    });
  }, [tabKey]);

  const refresh = useCallback(() => { return fetchData(true) }, [fetchData]);
  return { data, isLoading, isRefreshing, error, refresh, updateData };
}
