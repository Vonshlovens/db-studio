import { describe, expect, it } from 'vitest';
import { parseDBML } from './parser';
import { generateDBML } from './generator';
import { sampleDBML } from '$lib/data/sample';

function relationKey(schema: NonNullable<ReturnType<typeof parseDBML>['schema']>, index: number) {
	const relation = schema.relations[index];
	const fromTable = schema.tables.find((table) => table.id === relation.from.tableId);
	const toTable = schema.tables.find((table) => table.id === relation.to.tableId);
	const fromColumn = fromTable?.columns.find((column) => column.id === relation.from.columnId);
	const toColumn = toTable?.columns.find((column) => column.id === relation.to.columnId);
	return {
		from: `${fromTable?.name}.${fromColumn?.name}`,
		to: `${toTable?.name}.${toColumn?.name}`,
		type: relation.type
	};
}

describe('DBML parser relations', () => {
	it('extracts inline ref constraints from sample DBML', () => {
		const result = parseDBML(sampleDBML);
		expect(result.schema).not.toBeNull();
		const keys = result.schema!.relations.map((_, index) => relationKey(result.schema!, index));

		expect(keys).toEqual(
			expect.arrayContaining([
				{ from: 'posts.user_id', to: 'users.id', type: 'many-to-one' },
				{ from: 'comments.post_id', to: 'posts.id', type: 'many-to-one' },
				{ from: 'comments.user_id', to: 'users.id', type: 'many-to-one' },
				{ from: 'post_categories.post_id', to: 'posts.id', type: 'many-to-one' },
				{ from: 'post_categories.category_id', to: 'categories.id', type: 'many-to-one' }
			])
		);
		expect(keys).toHaveLength(5);

		const userId = result.schema!.tables
			.find((table) => table.name === 'posts')
			?.columns.find((column) => column.name === 'user_id');
		expect(userId?.constraints.fk).toBe(true);
	});

	it('parses standalone Ref statements and cardinality symbols', () => {
		const result = parseDBML(`
Table users {
  id int [pk]
  profile_id int
}

Table profiles {
  id int [pk]
  user_id int
}

Ref: profiles.user_id - users.id
Ref named_ref {
  users.profile_id < profiles.id
}
`);
		expect(result.schema).not.toBeNull();
		const keys = result.schema!.relations.map((_, index) => relationKey(result.schema!, index));
		expect(keys).toEqual(
			expect.arrayContaining([
				{ from: 'profiles.user_id', to: 'users.id', type: 'one-to-one' },
				{ from: 'users.profile_id', to: 'profiles.id', type: 'one-to-many' }
			])
		);
		expect(result.schema!.relations.find((relation) => relation.name === 'named_ref')).toBeTruthy();
	});

	it('resolves refs even when the target table is declared later', () => {
		const result = parseDBML(`
Table posts {
  id int [pk]
  user_id int [ref: > users.id]
}

Table users {
  id int [pk]
}
`);
		expect(result.schema).not.toBeNull();
		expect(relationKey(result.schema!, 0)).toEqual({
			from: 'posts.user_id',
			to: 'users.id',
			type: 'many-to-one'
		});
	});

	it('round-trips relation endpoints through generate then parse', () => {
		const parsed = parseDBML(sampleDBML);
		expect(parsed.schema).not.toBeNull();
		const dbml = generateDBML(parsed.schema!);
		expect(dbml).toContain('posts.user_id > users.id');
		expect(dbml).not.toContain('table_');

		const roundTrip = parseDBML(dbml);
		const original = parsed.schema!.relations.map((_, index) => relationKey(parsed.schema!, index));
		const again = roundTrip.schema!.relations.map((_, index) => relationKey(roundTrip.schema!, index));
		expect(again).toEqual(original);
	});

	it('marks increment constraints and skips indexes blocks', () => {
		const result = parseDBML(sampleDBML);
		const usersId = result.schema!.tables
			.find((table) => table.name === 'users')
			?.columns.find((column) => column.name === 'id');
		expect(usersId?.constraints.increment).toBe(true);
		expect(result.schema!.tables.find((table) => table.name === 'post_categories')?.columns.map((column) => column.name)).toEqual([
			'post_id',
			'category_id'
		]);
	});
});
