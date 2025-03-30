import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "./db";

async function main() {
  const db = drizzle(pool);
  
  console.log("⏳ Running migrations...");
  
  await migrate(db, {
    migrationsFolder: "./server/migrations",
  });
  
  console.log("✅ Migrations completed!");
  
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Migration failed!");
  console.error(err);
  process.exit(1);
});