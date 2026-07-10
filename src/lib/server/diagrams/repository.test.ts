import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT_STATE, DEFAULT_SCHEMA } from '$lib/types';
import { databaseSchema } from '$lib/server/db/schema';
import { DiagramRepository } from './repository';

describe('DiagramRepository', () => {
	let client: Client;
	let repository: DiagramRepository;
	let now: Date;
	let idSequence: number;

	beforeEach(async () => {
		client = createClient({ url: ':memory:' });
		await client.executeMultiple(`
			CREATE TABLE diagrams (
				id text PRIMARY KEY NOT NULL,
				owner_id text NOT NULL,
				name text NOT NULL,
				schema_json text NOT NULL,
				layout_json text NOT NULL,
				created_at integer NOT NULL,
				updated_at integer NOT NULL
			);
			CREATE INDEX diagrams_owner_updated_idx
				ON diagrams (owner_id, updated_at);
		`);

		now = new Date('2026-07-10T08:00:00.000Z');
		idSequence = 0;
		repository = new DiagramRepository(drizzle(client, { schema: databaseSchema }), {
			createId: () => `diagram-${++idSequence}`,
			now: () => now
		});
	});

	afterEach(() => {
		client.close();
	});

	it('round-trips persisted data and lists only the current owner', async () => {
		const aliceDiagram = await repository.create('owner-alice', {
			name: ' Alice schema ',
			schema: structuredClone(DEFAULT_SCHEMA),
			layout: structuredClone(DEFAULT_LAYOUT_STATE)
		});
		await repository.create('owner-bob', {
			name: 'Bob schema',
			schema: structuredClone(DEFAULT_SCHEMA),
			layout: structuredClone(DEFAULT_LAYOUT_STATE)
		});

		expect(aliceDiagram).toMatchObject({
			id: 'diagram-1',
			name: 'Alice schema',
			schema: DEFAULT_SCHEMA,
			layout: DEFAULT_LAYOUT_STATE,
			createdAt: now,
			updatedAt: now
		});
		expect(await repository.list('owner-alice')).toEqual([
			{
				id: 'diagram-1',
				name: 'Alice schema',
				createdAt: now,
				updatedAt: now
			}
		]);
		expect(await repository.findById('owner-bob', aliceDiagram.id)).toBeNull();
	});

	it('scopes updates and deletes by owner ID', async () => {
		const diagram = await repository.create('owner-alice', {
			name: 'Before',
			schema: structuredClone(DEFAULT_SCHEMA),
			layout: structuredClone(DEFAULT_LAYOUT_STATE)
		});

		now = new Date('2026-07-10T08:05:00.000Z');
		expect(await repository.update('owner-bob', diagram.id, { name: 'Stolen' })).toBeNull();

		const updated = await repository.update('owner-alice', diagram.id, { name: 'After' });
		expect(updated).toMatchObject({ name: 'After', updatedAt: now });
		expect(await repository.delete('owner-bob', diagram.id)).toBe(false);
		expect(await repository.delete('owner-alice', diagram.id)).toBe(true);
		expect(await repository.findById('owner-alice', diagram.id)).toBeNull();
	});
});
