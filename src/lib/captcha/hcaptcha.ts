import "server-only";
import { env } from "../env";

export interface CaptchaVerification {
  ok: boolean;
  reason?: string;
}

/**
 * Verify an hCaptcha token submitted from the browser.
 *
 * If `HCAPTCHA_SECRET_KEY` is not configured, verification is skipped
 * and the call returns `{ ok: true, reason: "disabled" }`. This keeps
 * local development frictionless; production deployments must set the
 * secret for the verification to be enforced.
 */
export async function verifyCaptcha(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<CaptchaVerification> {
  const secret = env().HCAPTCHA_SECRET_KEY;
  if (!secret) {
    return { ok: true, reason: "disabled" };
  }
  if (!token) {
    return { ok: false, reason: "missing-token" };
  }
  const body = new URLSearchParams({
    secret,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  });
  const res = await fetch("https://api.hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    return { ok: false, reason: `hcaptcha-http-${res.status}` };
  }
  const data = (await res.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };
  if (!data.success) {
    return {
      ok: false,
      reason: data["error-codes"]?.join(",") ?? "hcaptcha-rejected",
    };
  }
  return { ok: true };
}
