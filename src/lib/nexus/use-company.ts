import { useEffect, useState } from "react";
import { useReadySession } from "@/components/shell";
import { errorText } from "./use-load";
import { loadCompany } from "./company-api";

export function useCompany<T>(view: string, missionId = "") {
  const { user, pending } = useReadySession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const id = user?.id ?? "";

  useEffect(() => {
    if (pending) return;
    if (!id) {
      setLoading(false);
      setData(null);
      return;
    }
    let cancel = false;
    setLoading(true);
    loadCompany({ data: { view, missionId } })
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
  }, [pending, id, view, missionId, tick]);

  return { data, error, loading: pending || loading, reload: () => setTick((value) => value + 1) };
}

export { errorText };
