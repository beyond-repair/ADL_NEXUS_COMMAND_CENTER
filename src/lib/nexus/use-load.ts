import { useEffect, useState } from "react";
import { loadQuery } from "./api";
import type { Query } from "./domain";
import { useReadySession } from "@/components/shell";

export function errorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "The request failed.";
}

export function useLoad<T>(query: Query | null) {
  const { user, pending } = useReadySession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const id = user?.id ?? "";
  const key = query ? JSON.stringify(query) : "";

  useEffect(() => {
    if (pending) return;
    if (!id || !key) {
      setLoading(false);
      setData(null);
      return;
    }
    let cancel = false;
    setLoading(true);
    loadQuery({ data: JSON.parse(key) as Query })
      .then((result) => {
        if (cancel) return;
        setData(result as T);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancel) setError(errorText(err));
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [pending, id, key, tick]);

  return {
    data,
    error,
    loading: pending || loading,
    reload: () => setTick((value) => value + 1),
    signedIn: Boolean(id) && !pending,
  };
}
