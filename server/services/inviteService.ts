import crypto from "crypto";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  const secret =
    process.env.INVITE_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.DEPOSIT_CONFIRM_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required for invite tokens");
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

/** HMAC invite token bound to a user id with expiry. */
export function createInviteToken(userId: number): string {
  const exp = Date.now() + INVITE_TTL_MS;
  const payload = `invite:${userId}:${exp}`;
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest();
  return `${base64url(payload)}.${base64url(sig)}`;
}

export function verifyInviteToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const payload = fromBase64url(parts[0]).toString("utf8");
    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest();
    const provided = fromBase64url(parts[1]);
    if (
      expected.length !== provided.length ||
      !crypto.timingSafeEqual(expected, provided)
    ) {
      return null;
    }

    const [kind, idStr, expStr] = payload.split(":");
    if (kind !== "invite") return null;
    const userId = Number(idStr);
    const exp = Number(expStr);
    if (!Number.isFinite(userId) || !Number.isFinite(exp)) return null;
    if (Date.now() > exp) return null;
    return userId;
  } catch {
    return null;
  }
}

export function buildInviteUrl(token: string): string {
  const base =
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://serasomatic.vercel.app");
  return `${base}/onboard?token=${encodeURIComponent(token)}`;
}
