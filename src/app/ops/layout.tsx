import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/auth/admin";
import "../globals.css";

export const metadata = {
  title: "demokrati — ops",
  robots: { index: false, follow: false },
};

export default async function OpsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  const authed = verifyAdminCookie(value);

  return (
    <html lang="sv" dir="ltr" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthGate authed={authed}>{children}</AuthGate>
      </body>
    </html>
  );
}

function AuthGate({
  authed,
  children,
}: {
  authed: boolean;
  children: ReactNode;
}) {
  // Login page itself should render regardless; every other /ops route
  // redirects to /ops/login if unauthenticated. Route-level checks live
  // in /ops/page.tsx etc.
  if (!authed) {
    // Children decides via its own check; we pass through for /login, but
    // for other routes the page wrapper redirects. See /ops/page.tsx.
  }
  return <>{children}</>;
}

export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  if (!verifyAdminCookie(value)) {
    redirect("/ops/login");
  }
}
