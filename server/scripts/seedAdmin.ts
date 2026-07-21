/**
 * Create the first admin user when the users table is empty.
 *
 * Usage:
 *   SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='...' SEED_ADMIN_USERNAME=admin \
 *     npx tsx --env-file=.env server/scripts/seedAdmin.ts
 */
import { db } from "../db.js";
import { users } from "@shared/schema";
import { hashPassword } from "../middleware/auth.js";
import { sql } from "drizzle-orm";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const username = process.env.SEED_ADMIN_USERNAME || "admin";

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required");
  }
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);

  if (count > 0) {
    console.log(`Users already exist (${count}). Skipping seed.`);
    return;
  }

  const hashed = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      username,
      email,
      password: hashed,
      totpEnabled: false,
    })
    .returning();

  console.log(`Created admin user id=${user.id} email=${user.email}`);
  console.log("Log in and enroll Google Authenticator immediately.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
