"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const wrapped = <ToastProvider>{children}</ToastProvider>;
  if (!key || key.includes("xxxxxxxx")) {
    return wrapped;
  }
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1F2937",
          colorBackground: "#FFFFFF",
          colorForeground: "#141A24",
          borderRadius: "4px",
        },
      }}
    >
      {wrapped}
    </ClerkProvider>
  );
}
