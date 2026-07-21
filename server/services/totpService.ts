import crypto from "crypto";
import {
  generateSecret,
  generateURI,
  verifySync,
} from "otplib";
import QRCode from "qrcode";
import { hash, compare } from "bcrypt";

const APP_NAME = "Serasomatic";
const RECOVERY_CODE_COUNT = 8;

function getEncryptionKey(): Buffer {
  const secret =
    process.env.TOTP_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("TOTP_ENCRYPTION_KEY or SESSION_SECRET is required");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv,
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export function generateTotpSecret(): string {
  return generateSecret();
}

export function buildOtpauthUri(email: string, secret: string): string {
  return generateURI({
    issuer: APP_NAME,
    label: email,
    secret,
  });
}

export async function buildQrDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri);
}

export function verifyTotpCode(secret: string, token: string): boolean {
  try {
    const result = verifySync({
      secret,
      token: token.replace(/\s/g, ""),
    });
    return Boolean(result?.valid);
  } catch {
    return false;
  }
}

function randomRecoveryCode(): string {
  return crypto.randomBytes(4).toString("hex");
}

export async function generateRecoveryCodes(): Promise<{
  plain: string[];
  hashed: string[];
}> {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    randomRecoveryCode(),
  );
  const hashed = await Promise.all(
    plain.map((code) => hash(code.toLowerCase(), 10)),
  );
  return { plain, hashed };
}

export async function consumeRecoveryCode(
  hashedCodes: string[] | null | undefined,
  attempt: string,
): Promise<{ ok: boolean; remaining: string[] }> {
  if (!hashedCodes?.length) {
    return { ok: false, remaining: [] };
  }

  const remaining: string[] = [];
  let matched = false;
  const normalized = attempt.trim().toLowerCase();

  for (const hashed of hashedCodes) {
    if (!matched && (await compare(normalized, hashed))) {
      matched = true;
      continue;
    }
    remaining.push(hashed);
  }

  return { ok: matched, remaining };
}

/** Short-lived signed token for the MFA challenge step after password login. */
export function createMfaChallengeToken(userId: number): string {
  const exp = Date.now() + 5 * 60 * 1000;
  const payload = `${userId}:${exp}`;
  const sig = crypto
    .createHmac("sha256", getEncryptionKey())
    .update(payload)
    .digest("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function verifyMfaChallengeToken(
  token: string | undefined,
): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const payload = Buffer.from(parts[0], "base64url").toString("utf8");
    const expected = crypto
      .createHmac("sha256", getEncryptionKey())
      .update(payload)
      .digest("base64url");
    const a = Buffer.from(expected);
    const b = Buffer.from(parts[1]);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const [idStr, expStr] = payload.split(":");
    const userId = Number(idStr);
    const exp = Number(expStr);
    if (!Number.isFinite(userId) || !Number.isFinite(exp)) return null;
    if (Date.now() > exp) return null;
    return userId;
  } catch {
    return null;
  }
}

export function toPublicUser(user: {
  id: number;
  username: string;
  email: string;
  createdAt?: Date | null;
  totpEnabled?: boolean | null;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
    totpEnabled: Boolean(user.totpEnabled),
  };
}
