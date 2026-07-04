'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useApi<T = unknown>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      apiFn: () => Promise<{ data: { data: T; success: boolean; message?: string } }>,
      options?: UseApiOptions<T>
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFn();
        const responseData = res.data.data;
        setData(responseData);
        if (options?.successMessage) {
          toast.success(options.successMessage);
        }
        options?.onSuccess?.(responseData);
        return responseData;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          options?.errorMessage ||
          'Something went wrong';
        setError(message);
        toast.error(message);
        options?.onError?.(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { data, loading, error, execute };
}

export function useAsyncData<T>(
  apiFn: () => Promise<{ data: { data: T } }>,
  deps: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn();
      setData(res.data.data);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: fetch };
}
