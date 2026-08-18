"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function Providers({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key || key.includes("xxxxxxxx")) {
    return children;
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
      {children}
    </ClerkProvider>
  );
}
