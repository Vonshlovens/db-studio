import { sampleSchema } from '$lib/data/sample';
import { describe, expect, it } from 'vitest';
import { getColumnCenterY, TABLE_WIDTH } from './table-geometry';
import { getRelationRoute, routeCutsThroughTable } from './relation-routing';
import type { Relation, Table } from '$lib/types';

function table(id: string, x: number, y: number, columns: string[]): Table {
	return {
		id,
		name: id,
		columns: columns.map((name) => ({
			id: `${id}_${name}`,
			name,
			type: 'int',
			constraints: {}
		})),
		indexes: [],
		position: { x, y }
	};
}

function relation(
	from: Table,
	fromColumn: string,
	to: Table,
	toColumn: string,
	type: Relation['type'] = 'many-to-one'
): Relation {
	return {
		id: `rel_${from.id}_${to.id}`,
		from: { tableId: from.id, columnId: `${from.id}_${fromColumn}` },
		to: { tableId: to.id, columnId: `${to.id}_${toColumn}` },
		type
	};
}

describe('relation routing', () => {
	it('anchors lines to the related column rows on opposite sides', () => {
		const users = table('users', 50, 50, ['id', 'email']);
		const posts = table('posts', 400, 50, ['id', 'user_id', 'title']);
		const route = getRelationRoute(relation(posts, 'user_id', users, 'id'), [users, posts]);

		expect(route).not.toBeNull();
		expect(route!.start.side).toBe('left');
		expect(route!.end.side).toBe('right');
		expect(route!.start.x).toBe(posts.position.x);
		expect(route!.end.x).toBe(users.position.x + TABLE_WIDTH);
		expect(route!.start.y).toBe(posts.position.y + getColumnCenterY(1));
		expect(route!.end.y).toBe(users.position.y + getColumnCenterY(0));
		expect(routeCutsThroughTable(route!, [users, posts])).toBe(false);
	});

	it('uses a same-side detour when tables stack without a horizontal gap', () => {
		const posts = table('posts', 400, 50, ['id', 'title']);
		const comments = table('comments', 400, 350, ['id', 'post_id']);
		const route = getRelationRoute(relation(comments, 'post_id', posts, 'id'), [posts, comments]);

		expect(route).not.toBeNull();
		expect(route!.start.side).toBe('right');
		expect(route!.end.side).toBe('right');
		expect(route!.path).toMatch(/H \d/);
		expect(routeCutsThroughTable(route!, [posts, comments])).toBe(false);
	});

	it('does not route through overlapping tables', () => {
		const left = table('left', 0, 0, ['id']);
		const overlap = table('overlap', 80, 40, ['id', 'left_id']);
		const route = getRelationRoute(relation(overlap, 'left_id', left, 'id'), [left, overlap]);

		expect(route).not.toBeNull();
		expect(routeCutsThroughTable(route!, [left, overlap])).toBe(false);
		expect(route!.start.side).toBe('right');
		expect(route!.end.side).toBe('left');
		expect(route!.start.x).toBe(overlap.position.x + TABLE_WIDTH);
		expect(route!.end.x).toBe(left.position.x);
	});

	it('draws crow feet on the many side and a bar on the one side', () => {
		const users = table('users', 0, 0, ['id']);
		const posts = table('posts', 400, 0, ['user_id']);
		const route = getRelationRoute(relation(posts, 'user_id', users, 'id'), [users, posts]);

		expect(route!.marks).toHaveLength(2);
		expect(route!.marks[0]).toContain(`M ${route!.start.x} `);
		expect(route!.marks[1]).toMatch(/^M \d/);
		expect(route!.marks[0].split('L').length).toBeGreaterThan(route!.marks[1].split('L').length);
	});

	it('returns null when an endpoint table is missing', () => {
		const users = table('users', 0, 0, ['id']);
		expect(getRelationRoute(relation(users, 'id', table('missing', 300, 0, ['id']), 'id'), [users])).toBeNull();
	});

	it('routes every sample-schema relation without cutting through tables', () => {
		for (const rel of sampleSchema.relations) {
			const route = getRelationRoute(rel, sampleSchema.tables);
			expect(route).not.toBeNull();
			expect(routeCutsThroughTable(route!, sampleSchema.tables)).toBe(false);
		}
	});
});
