// Root layout passthrough — the real <html>/<body> live in app/[locale]/layout.tsx.
// Middleware guarantees every request reaches a locale segment.
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
