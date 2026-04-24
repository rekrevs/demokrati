import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/auth/admin";

export default async function OpsHome() {
  const store = await cookies();
  if (!verifyAdminCookie(store.get(ADMIN_COOKIE)?.value)) {
    redirect("/ops/login");
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-10">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Operator panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Scen-läge och underhåll. Inte publik yta.
          </p>
        </div>
        <form action="/api/admin/logout" method="POST">
          <Button type="submit" variant="outline" size="sm">
            Logga ut
          </Button>
        </form>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Här landar scen-kontroller, cache-warming och kör-översikt
          vartefter demos byggs.
        </CardContent>
      </Card>
    </main>
  );
}
