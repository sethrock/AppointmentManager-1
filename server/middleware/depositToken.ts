import crypto from "crypto";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret =
    process.env.DEPOSIT_CONFIRM_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "DEPOSIT_CONFIRM_SECRET or SESSION_SECRET is required for deposit tokens",
    );
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

/** HMAC-SHA256 signed token bound to an appointment id with expiry. */
export function generateDepositConfirmToken(appointmentId: number): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${appointmentId}:${exp}`;
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest();
  return `${base64url(payload)}.${base64url(sig)}`;
}

export function validateDepositConfirmToken(
  appointmentId: number,
  token: string | undefined,
): boolean {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  try {
    const payload = fromBase64url(parts[0]).toString("utf8");
    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest();
    const providedSig = fromBase64url(parts[1]);

    if (
      expectedSig.length !== providedSig.length ||
      !crypto.timingSafeEqual(expectedSig, providedSig)
    ) {
      return false;
    }

    const [idStr, expStr] = payload.split(":");
    const id = Number(idStr);
    const exp = Number(expStr);
    if (!Number.isFinite(id) || !Number.isFinite(exp)) return false;
    if (id !== appointmentId) return false;
    if (Date.now() > exp) return false;
    return true;
  } catch {
    return false;
  }
}
