import { Pool, neon, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;

// Session store and any raw pool usage. On Vercel, force HTTP so WebSockets cannot hang.
if (process.env.VERCEL) {
  neonConfig.poolQueryViaFetch = true;
} else {
  neonConfig.webSocketConstructor = ws;
}

export const pool = new Pool({ connectionString });

// Drizzle: HTTP on Vercel (serverless-safe), WebSocket Pool locally.
export const db = process.env.VERCEL
  ? drizzleHttp(neon(connectionString), { schema })
  : drizzleWs(pool, { schema });
