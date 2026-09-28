import 'dotenv/config';

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL?.trim();

const poolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: {
        rejectUnauthorized: false,
      },
    }
  : {
      host: process.env.SQL_HOST || '127.0.0.1',
      user: process.env.SQL_USER || 'caregrid_user',
      password: process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DB_NAME || 'caregrid',
      port: Number(process.env.SQL_PORT || 55432),
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: false,
    };

export const pool = new Pool(poolConfig);

export const db = drizzle(pool, {
  schema,
});

export async function checkDatabaseConnection(): Promise<{
  healthy: boolean;
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    await pool.query('SELECT 1');

    const latencyMs = Date.now() - start;

    return {
      healthy: true,
      connected: true,
      latencyMs,
    };
  } catch (err) {
    return {
      healthy: false,
      connected: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}