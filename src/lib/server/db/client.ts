import { building, dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { DiagramRepository } from '$lib/server/diagrams/repository';
import { databaseSchema } from './schema';

const DEVELOPMENT_DATABASE_URL = 'file:./data/db-studio.db';

let client: Client | undefined;
let database: LibSQLDatabase<typeof databaseSchema> | undefined;
let diagramRepository: DiagramRepository | undefined;

function databaseUrl(): string {
	const configuredUrl = env.DATABASE_URL?.trim();
	if (configuredUrl) return configuredUrl;

	if (!dev && !building) {
		throw new Error('DATABASE_URL is required in production');
	}

	return DEVELOPMENT_DATABASE_URL;
}

export function getDatabaseClient(): Client {
	if (!client) {
		client = createClient({
			url: databaseUrl(),
			authToken: env.DATABASE_AUTH_TOKEN?.trim() || undefined
		});
	}
	return client;
}

export function getDatabase(): LibSQLDatabase<typeof databaseSchema> {
	if (!database) {
		database = drizzle(getDatabaseClient(), { schema: databaseSchema });
	}
	return database;
}

export function getDiagramRepository(): DiagramRepository {
	if (!diagramRepository) {
		diagramRepository = new DiagramRepository(getDatabase());
	}
	return diagramRepository;
}
