"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "error";

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  tone: ToastTone;
};

type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneClasses(tone: ToastTone) {
  switch (tone) {
    case "success":
      return "border-l-moss-600 bg-moss-50 text-moss-700";
    case "error":
      return "border-l-danger bg-danger-bg text-danger";
    default:
      return "border-l-ink-700 bg-stone-0 text-ink-800";
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, message, tone = "default", durationMs = 5200 }: ToastInput) => {
      const id = crypto.randomUUID();
      setItems((current) => [...current, { id, title, message, tone }]);
      const timer = setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message, title) => toast({ message, title, tone: "success" }),
      error: (message, title) => toast({ message, title, tone: "error" }),
    }),
    [toast],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) clearTimeout(timer);
      activeTimers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-sm border border-stone-200 border-l-[3px] px-4 py-3 shadow-md",
              toneClasses(item.tone),
            )}
          >
            {item.title ? (
              <p className="text-[0.8125rem] font-semibold">{item.title}</p>
            ) : null}
            <p className={cn("text-sm", item.title ? "mt-0.5" : undefined)}>
              {item.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="mt-2 text-xs font-medium underline-offset-2 hover:underline"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
