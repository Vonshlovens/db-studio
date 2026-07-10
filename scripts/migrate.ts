import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

const configuredUrl = process.env.DATABASE_URL?.trim();

if (!configuredUrl && process.env.NODE_ENV === 'production') {
	throw new Error('DATABASE_URL is required when running migrations in production');
}

const databaseUrl = configuredUrl || 'file:./data/db-studio.db';
const client = createClient({
	url: databaseUrl,
	authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined
});

try {
	await migrate(drizzle(client), {
		migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url))
	});
	console.info('Database migrations completed');
} finally {
	client.close();
}
