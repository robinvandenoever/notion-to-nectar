import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  console.log("DB url:", connectionString ? "set" : "missing");

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  return pool;
}