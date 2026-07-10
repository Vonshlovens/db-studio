import { defineConfig } from 'drizzle-kit';

const developmentUrl = 'file:./data/db-studio.db';
const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl && process.env.NODE_ENV === 'production') {
	throw new Error('DATABASE_URL is required when running Drizzle in production');
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'turso',
	dbCredentials: {
		url: databaseUrl || developmentUrl,
		authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined
	},
	strict: true,
	verbose: true
});
