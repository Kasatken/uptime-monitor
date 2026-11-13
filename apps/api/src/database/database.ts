import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { Inject, Logger } from '@nestjs/common';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { migrate as migrateNodePg } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import pg from 'pg';
import * as schema from './schema.js';

/** Driver-agnostic type: repositories don't care whether it's PGlite or a real server. */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export const DATABASE = Symbol('DATABASE');
export const InjectDatabase = () => Inject(DATABASE);

export interface DatabaseConnection {
  db: Database;
  close: () => Promise<void>;
}

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));
const logger = new Logger('Database');

/**
 * With DATABASE_URL we talk to a regular Postgres server. Without it we run Postgres
 * in-process via PGlite (WASM), so the project starts with zero infrastructure.
 * Same schema, same SQL, same migrations.
 */
export async function connectDatabase(options: {
  url?: string;
  pgliteDir: string;
}): Promise<DatabaseConnection> {
  if (options.url) {
    const pool = new pg.Pool({ connectionString: options.url, max: 10 });
    const db = drizzleNodePg(pool, { schema, casing: 'snake_case' });
    await migrateNodePg(db, { migrationsFolder: MIGRATIONS_FOLDER });
    logger.log('Connected to Postgres');
    return { db, close: () => pool.end() };
  }

  // `memory://` is handy for tests
  if (!options.pgliteDir.startsWith('memory://')) {
    await mkdir(options.pgliteDir, { recursive: true });
  }
  const client = await PGlite.create(options.pgliteDir);
  const db = drizzlePglite(client, { schema, casing: 'snake_case' });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  logger.log(`Using embedded PGlite at ${options.pgliteDir}`);
  return { db, close: () => client.close() };
}
