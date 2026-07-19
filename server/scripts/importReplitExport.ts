/**
 * Import Replit appointments export with full financial recompute.
 * Nulls client_id before import (clients table is populated via migrateClients + link).
 *
 * Run: npx tsx --env-file=.env server/scripts/importReplitExport.ts
 */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { secureImportAppointments } from "../services/secureImportService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultExport = path.resolve(
  __dirname,
  "../../attached_assets/Database_exports_7.19.26/appointments.json",
);

async function main() {
  const filePath = process.argv[2] || defaultExport;
  console.log(`Importing from ${filePath}`);

  const raw = JSON.parse(await fs.readFile(filePath, "utf-8"));
  if (!Array.isArray(raw)) {
    throw new Error("Export must be a JSON array of appointments");
  }

  // Avoid FK failures against an empty/mismatched clients table
  const sanitized = raw.map((row: Record<string, unknown>) => ({
    ...row,
    client_id: null,
    clientId: null,
  }));

  const tempPath = path.join(os.tmpdir(), `appointments-import-${Date.now()}.json`);
  await fs.writeFile(tempPath, JSON.stringify(sanitized));
  console.log(`Wrote sanitized import file (${sanitized.length} rows) to ${tempPath}`);

  const result = await secureImportAppointments(tempPath);
  await fs.unlink(tempPath).catch(() => undefined);

  console.log(JSON.stringify({
    success: result.success,
    totalRecords: result.totalRecords,
    importedRecords: result.importedRecords,
    skippedRecords: result.skippedRecords,
    backupTableName: result.backupTableName,
    errorCount: result.errors.length,
    errors: result.errors.slice(0, 20),
  }, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
