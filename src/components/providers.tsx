"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorker } from "@/components/service-worker";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster position="top-center" richColors />
      <ServiceWorker />
    </ThemeProvider>
  );
}
