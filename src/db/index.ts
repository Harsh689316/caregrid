import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

export const pool = new Pool({
  host: process.env.SQL_HOST || '127.0.0.1',
  user: process.env.SQL_USER || 'caregrid_user',
  password: process.env.SQL_PASSWORD || '',
  database: process.env.SQL_DB_NAME || 'caregrid',
  port: Number(process.env.SQL_PORT || 55432),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

export async function checkDatabaseConnection(): Promise<{
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const res = await pool.query('SELECT 1 as healthy;');
    const latencyMs = Date.now() - start;

    return {
      healthy: res.rows[0]?.healthy === 1,
      latencyMs,
    };
  } catch (err: any) {
    return {
      healthy: false,
      error: err.message,
    };
  }
}
