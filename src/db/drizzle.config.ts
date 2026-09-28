import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.SQL_HOST || '127.0.0.1',
    user: process.env.SQL_USER || 'caregrid_user',
    password: process.env.SQL_PASSWORD || '',
    database: process.env.SQL_DB_NAME || 'caregrid',
    port: Number(process.env.SQL_PORT || 55432),
    ssl: false,
  },
});
