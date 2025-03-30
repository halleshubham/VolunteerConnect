import { defineConfig } from "drizzle-kit";
import dotenv from 'dotenv';
dotenv.config();

console.log("SHACKY LOG - "+process.env.DATABASE_URL)

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./server/migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
