import { db } from "./db";
import { log } from "./vite";

async function createSessionsTable() {
  try {
    log("Creating sessions table if it doesn't exist...");
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(255) PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      )
    `);
    
    await db.execute(`
      CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire)
    `);
    
    log("Sessions table created successfully.");
  } catch (error) {
    console.error("Error creating sessions table:", error);
  }
}

// Run the function
createSessionsTable()
  .then(() => {
    console.log("Sessions table check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });