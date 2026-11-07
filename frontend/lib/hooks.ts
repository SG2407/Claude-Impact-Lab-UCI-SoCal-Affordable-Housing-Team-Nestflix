"use client";

import { useEffect, useState } from "react";
import { useProject } from "./project-context";

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Re-sync the shared project when a dashboard opens so cross-portal changes show up. */
export function useSyncOnMount() {
  const { refresh } = useProject();
  useEffect(() => {
    void refresh();
  }, [refresh]);
}
