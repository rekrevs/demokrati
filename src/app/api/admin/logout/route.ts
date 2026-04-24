import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/auth/admin";

export async function POST(request: Request) {
  const cookie = clearAdminCookie();
  const accept = request.headers.get("accept") ?? "";
  const res = accept.includes("text/html")
    ? NextResponse.redirect(new URL("/ops/login", request.url), 303)
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
