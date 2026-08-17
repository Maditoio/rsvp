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
          colorPrimary: "#3e3768",
          colorBackground: "#ffffff",
          colorForeground: "#2e3345",
          borderRadius: "0.9rem",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
