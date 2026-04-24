import { NextResponse } from "next/server";
import {
  issueAdminCookie,
  verifyAdminPassword,
} from "@/lib/auth/admin";

const MIN_FAILED_DELAY_MS = 400;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let password: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    password = typeof body.password === "string" ? body.password : null;
  } else {
    const form = await request.formData();
    const raw = form.get("password");
    password = typeof raw === "string" ? raw : null;
  }

  const ok = password ? await verifyAdminPassword(password) : false;

  if (!ok) {
    // Equalise failed-login timing to slow down brute-force.
    await new Promise((r) => setTimeout(r, MIN_FAILED_DELAY_MS));
    const accept = request.headers.get("accept") ?? "";
    if (accept.includes("text/html")) {
      return NextResponse.redirect(
        new URL("/ops/login?error=invalid", request.url),
        303,
      );
    }
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 },
    );
  }

  const cookie = issueAdminCookie();
  const accept = request.headers.get("accept") ?? "";
  const res = accept.includes("text/html")
    ? NextResponse.redirect(new URL("/ops", request.url), 303)
    : NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    secure: cookie.secure,
    maxAge: cookie.maxAge,
    path: cookie.path,
  });
  return res;
}
