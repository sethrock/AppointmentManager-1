import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_pending boolean NOT NULL DEFAULT false`;
  console.log("invite_pending column ready");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
