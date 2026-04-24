import "server-only";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

export const ADMIN_COOKIE = "demokrati-admin";
const MAX_AGE_SECONDS = 7 * 24 * 3_600;

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = env().ADMIN_PASSWORD_HASH;
  if (!hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export async function hashAdminPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function getSigningSecret(): string {
  const hash = env().ADMIN_PASSWORD_HASH;
  if (!hash) {
    throw new Error(
      "ADMIN_PASSWORD_HASH must be set to issue or verify admin cookies.",
    );
  }
  return hash;
}

export interface AdminCookie {
  name: string;
  value: string;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  maxAge: number;
  path: "/";
}

export function issueAdminCookie(now = Date.now()): AdminCookie {
  const expiresAt = now + MAX_AGE_SECONDS * 1_000;
  const payload = `admin:${expiresAt}`;
  const sig = createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("hex");
  return {
    name: ADMIN_COOKIE,
    value: `${payload}.${sig}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  };
}

export function clearAdminCookie(): AdminCookie {
  return {
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  };
}

export function verifyAdminCookie(
  value: string | undefined,
  now = Date.now(),
): boolean {
  if (!value) return false;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return false;
  const payload = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  let secret: string;
  try {
    secret = getSigningSecret();
  } catch {
    return false;
  }
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (sig.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) {
    return false;
  }
  const [label, expStr] = payload.split(":");
  if (label !== "admin") return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < now) return false;
  return true;
}
