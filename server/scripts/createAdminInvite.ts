/**
 * Create an invited admin and print the onboarding URL.
 *
 * Usage:
 *   INVITE_EMAIL=serasomatic@gmail.com \
 *     npx tsx --env-file=.env server/scripts/createAdminInvite.ts
 */
import crypto from "crypto";
import { storage } from "../storage.js";
import { hashPassword } from "../middleware/auth.js";
import {
  buildInviteUrl,
  createInviteToken,
} from "../services/inviteService.js";

async function main() {
  const email = (process.env.INVITE_EMAIL || "").toLowerCase().trim();
  const username =
    process.env.INVITE_USERNAME?.trim() ||
    email.split("@")[0] ||
    "admin";

  if (!email) {
    throw new Error("INVITE_EMAIL is required");
  }

  const existing = await storage.getUserByEmail(email);
  if (existing) {
    if (!existing.invitePending) {
      throw new Error(
        `User ${email} already exists and has completed onboarding (id=${existing.id})`,
      );
    }
    const token = createInviteToken(existing.id);
    const inviteUrl = buildInviteUrl(token);
    console.log(`User already invited (id=${existing.id}). Fresh invite URL:`);
    console.log(inviteUrl);
    return;
  }

  if (await storage.getUserByUsername(username)) {
    throw new Error(
      `Username "${username}" already in use. Set INVITE_USERNAME to something unique.`,
    );
  }

  const placeholder = await hashPassword(crypto.randomBytes(32).toString("hex"));
  const user = await storage.createUser({
    username,
    email,
    password: placeholder,
    invitePending: true,
  });

  const token = createInviteToken(user.id);
  const inviteUrl = buildInviteUrl(token);

  console.log(`Created invited admin id=${user.id} email=${user.email}`);
  console.log(`Onboarding URL (valid 7 days):\n${inviteUrl}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
