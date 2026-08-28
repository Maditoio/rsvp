"use client";

import { useCallback, useRef, useState } from "react";
import type { EventSiteConfig } from "@/modules/event-sites/config";

const MAX_HISTORY = 40;

export function useBuilderState(initial: EventSiteConfig) {
  const [config, setConfigState] = useState(initial);
  const [historyMeta, setHistoryMeta] = useState({ past: 0, future: 0 });
  const past = useRef<EventSiteConfig[]>([]);
  const future = useRef<EventSiteConfig[]>([]);

  const syncMeta = useCallback(() => {
    setHistoryMeta({ past: past.current.length, future: future.current.length });
  }, []);

  const setConfig = useCallback(
    (updater: EventSiteConfig | ((prev: EventSiteConfig) => EventSiteConfig)) => {
      setConfigState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: EventSiteConfig) => EventSiteConfig)(prev)
            : updater;
        if (next === prev) return prev;
        past.current = [...past.current.slice(-(MAX_HISTORY - 1)), prev];
        future.current = [];
        syncMeta();
        return next;
      });
    },
    [syncMeta],
  );

  const undo = useCallback(() => {
    setConfigState((current) => {
      const prev = past.current.pop();
      if (!prev) return current;
      future.current.push(current);
      syncMeta();
      return prev;
    });
  }, [syncMeta]);

  const redo = useCallback(() => {
    setConfigState((current) => {
      const next = future.current.pop();
      if (!next) return current;
      past.current.push(current);
      syncMeta();
      return next;
    });
  }, [syncMeta]);

  const reset = useCallback(
    (next: EventSiteConfig) => {
      past.current = [];
      future.current = [];
      setConfigState(next);
      syncMeta();
    },
    [syncMeta],
  );

  return {
    config,
    setConfig,
    undo,
    redo,
    canUndo: historyMeta.past > 0,
    canRedo: historyMeta.future > 0,
    reset,
  };
}
