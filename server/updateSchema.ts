import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Update the users table schema to match our current definition
 */
async function updateUsersTable() {
  console.log("Updating users table schema...");
  
  try {
    // Check if email column exists
    const emailColumnExists = await checkIfColumnExists('users', 'email');
    if (!emailColumnExists) {
      console.log("Adding email column to users table");
      await db.execute(sql`ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE`);
    }
    
    // Check if first_name column exists
    const firstNameColumnExists = await checkIfColumnExists('users', 'first_name');
    if (!firstNameColumnExists) {
      console.log("Adding first_name column to users table");
      await db.execute(sql`ALTER TABLE users ADD COLUMN first_name VARCHAR(255)`);
    }
    
    // Check if last_name column exists
    const lastNameColumnExists = await checkIfColumnExists('users', 'last_name');
    if (!lastNameColumnExists) {
      console.log("Adding last_name column to users table");
      await db.execute(sql`ALTER TABLE users ADD COLUMN last_name VARCHAR(255)`);
    }
    
    // Check if profile_image_url column exists
    const profileImageUrlColumnExists = await checkIfColumnExists('users', 'profile_image_url');
    if (!profileImageUrlColumnExists) {
      console.log("Adding profile_image_url column to users table");
      await db.execute(sql`ALTER TABLE users ADD COLUMN profile_image_url VARCHAR(255)`);
    }
    
    // Check if created_at column exists
    const createdAtColumnExists = await checkIfColumnExists('users', 'created_at');
    if (!createdAtColumnExists) {
      console.log("Adding created_at column to users table");
      await db.execute(sql`ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW()`);
    }
    
    // Check if updated_at column exists
    const updatedAtColumnExists = await checkIfColumnExists('users', 'updated_at');
    if (!updatedAtColumnExists) {
      console.log("Adding updated_at column to users table");
      await db.execute(sql`ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW()`);
    }
    
    console.log("Users table schema update completed successfully");
  } catch (error) {
    console.error("Error updating users table schema:", error);
    throw error;
  }
}

/**
 * Helper function to check if a column exists in a table
 */
async function checkIfColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = ${tableName}
        AND column_name = ${columnName}
    ) as column_exists
  `);
  
  return result.rows[0].column_exists;
}

// Run the schema update
updateUsersTable()
  .then(() => {
    console.log("Schema update completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Schema update failed:", error);
    process.exit(1);
  });