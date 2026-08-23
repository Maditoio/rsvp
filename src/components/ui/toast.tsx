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
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
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

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-bg text-success">
        <CheckCircle2 className="size-4" strokeWidth={2} />
      </span>
    );
  }
  if (tone === "error") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-danger-bg text-danger">
        <AlertCircle className="size-4" strokeWidth={2} />
      </span>
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info-bg text-info">
      <Info className="size-4" strokeWidth={2} />
    </span>
  );
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
    ({ title, message, tone = "default", durationMs = 5000 }: ToastInput) => {
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
            className="pointer-events-auto flex w-full max-w-sm gap-3 rounded-lg bg-white px-4 py-3.5 shadow-lg"
          >
            <ToneIcon tone={item.tone} />
            <div className="min-w-0 flex-1">
              {item.title ? (
                <p className="text-[0.8125rem] font-semibold text-slate-900">
                  {item.title}
                </p>
              ) : null}
              <p
                className={cn(
                  "text-sm text-slate-600",
                  item.title ? "mt-0.5" : undefined,
                )}
              >
                {item.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Dismiss
              </button>
            </div>
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
