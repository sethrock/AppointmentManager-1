import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const sql = neon(process.env.DATABASE_URL);

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_recovery_codes json`;

  const cols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY column_name
  `;
  console.log("users columns:", cols.map((c: any) => c.column_name).join(", "));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
