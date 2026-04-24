import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/auth/admin";

export default async function OpsLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const store = await cookies();
  if (verifyAdminCookie(store.get(ADMIN_COOKIE)?.value)) {
    redirect("/ops");
  }
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Logga in</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action="/api/admin/login"
            method="POST"
            className="space-y-4"
          >
            <label className="block text-sm font-medium">
              Admin-lösenord
              <input
                type="password"
                name="password"
                required
                autoFocus
                autoComplete="current-password"
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </label>
            {error === "invalid" ? (
              <p className="text-sm text-red-600">Fel lösenord.</p>
            ) : null}
            <Button type="submit" className="w-full">
              Logga in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
