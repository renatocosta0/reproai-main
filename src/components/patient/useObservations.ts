"use client";

import { useCallback, useEffect, useState } from "react";
import { api, userMessage } from "@/lib/api-client";
import type { ObservationRecord } from "@/types/patient";

/**
 * The signed-in user's own observations. The API already scopes patients to
 * their own rows; the userId filter is a second guard.
 */
export function useObservations(userId: string | null | undefined) {
  const [all, setAll] = useState<ObservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ observations: ObservationRecord[] }>("/api/observations");
      setAll(res.observations);
      setError("");
    } catch (err) {
      setError(userMessage(err, "Could not load your health data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mine = userId ? all.filter((o) => o.userId === userId) : [];
  return { observations: mine, loading, error, refresh };
}
