import { describe, expect, it } from 'vitest';
import type { LayoutState, Schema } from '$lib/types';
import { DEFAULT_LAYOUT_STATE, DEFAULT_SCHEMA } from '$lib/types';
import { sampleDBML, sampleSchema } from '$lib/data/sample';
import { parseDBML } from '$lib/dbml/parser';
import {
	DiagramDataError,
	DiagramValidationError,
	assertLayoutState,
	deserializeLayout,
	deserializeSchema,
	parseCreateDiagramInput,
	parseUpdateDiagramInput,
	serializeLayout,
	serializeSchema
} from './serialization';

describe('diagram serialization', () => {
	it('round-trips the current Schema and LayoutState shapes', () => {
		const schema = structuredClone(sampleSchema);
		const layout = structuredClone(DEFAULT_LAYOUT_STATE);
		layout.tablePositions.table_users = { x: 50, y: 50 };

		expect(deserializeSchema(serializeSchema(schema))).toEqual(schema);
		expect(deserializeLayout(serializeLayout(layout))).toEqual(layout);
		expect(parseCreateDiagramInput({ name: 'Sample', schema, layout })).toMatchObject({
			schema,
			layout
		});
	});

	it('accepts a normally imported schema', () => {
		const result = parseDBML(sampleDBML);

		expect(result.schema).not.toBeNull();
		expect(() => serializeSchema(result.schema)).not.toThrow();
	});

	it('normalizes names and validates create input', () => {
		const input = parseCreateDiagramInput({
			name: '  Customer model  ',
			schema: structuredClone(DEFAULT_SCHEMA),
			layout: structuredClone(DEFAULT_LAYOUT_STATE)
		});

		expect(input.name).toBe('Customer model');
	});

	it('rejects invalid nested values with a useful path', () => {
		const layout = structuredClone(DEFAULT_LAYOUT_STATE) as unknown as Record<string, unknown>;
		layout.viewport = { x: 0, y: 0, zoom: Number.NaN };

		expect(() =>
			parseCreateDiagramInput({
				name: 'Invalid',
				schema: structuredClone(DEFAULT_SCHEMA),
				layout
			})
		).toThrowError(/layout\.viewport\.zoom/);
	});

	it.each([
		{ zoom: 0.099, expected: /layout\.viewport\.zoom must be between 0\.1 and 3/ },
		{ zoom: 3.001, expected: /layout\.viewport\.zoom must be between 0\.1 and 3/ }
	])('rejects renderer-breaking zoom $zoom', ({ zoom, expected }) => {
		const layout = structuredClone(DEFAULT_LAYOUT_STATE);
		layout.viewport.zoom = zoom;

		expect(() => serializeLayout(layout)).toThrowError(expected);
	});

	it.each([0, -1, 1000.001])('rejects renderer-breaking grid size %s', (gridSize) => {
		const layout = structuredClone(DEFAULT_LAYOUT_STATE);
		layout.gridSize = gridSize;

		expect(() => serializeLayout(layout)).toThrowError(/layout\.gridSize/);
	});

	it('accepts inclusive zoom limits and a bounded positive grid size', () => {
		for (const zoom of [0.1, 3]) {
			const layout = structuredClone(DEFAULT_LAYOUT_STATE);
			layout.viewport.zoom = zoom;
			layout.gridSize = 1000;
			expect(() => assertLayoutState(layout)).not.toThrow();
		}
	});

	it.each([
		['schema table position', (schema: Schema, _layout: LayoutState) => {
			schema.tables[0].position.x = Number.POSITIVE_INFINITY;
		}, /schema\.tables\[0\]\.position\.x/],
		['layout table position', (_schema: Schema, layout: LayoutState) => {
			layout.tablePositions.table_users = { x: 0, y: Number.NEGATIVE_INFINITY };
		}, /layout\.tablePositions\.table_users\.y/]
	])('rejects non-finite %s', (_label, mutate, expected) => {
		const schema = structuredClone(sampleSchema);
		const layout = structuredClone(DEFAULT_LAYOUT_STATE);
		mutate(schema, layout);

		expect(() => parseCreateDiagramInput({ name: 'Invalid', schema, layout })).toThrowError(
			expected
		);
	});

	it.each([
		['table', (schema: Schema) => {
			schema.tables[1].id = schema.tables[0].id;
		}, /schema\.tables\[1\]\.id must be unique.*schema\.tables\[0\]\.id/],
		['column within a table', (schema: Schema) => {
			schema.tables[0].columns[1].id = schema.tables[0].columns[0].id;
		}, /schema\.tables\[0\]\.columns\[1\]\.id must be unique/],
		['column across tables', (schema: Schema) => {
			schema.tables[1].columns[0].id = schema.tables[0].columns[0].id;
		}, /schema\.tables\[1\]\.columns\[0\]\.id must be unique/],
		['relation', (schema: Schema) => {
			schema.relations[1].id = schema.relations[0].id;
		}, /schema\.relations\[1\]\.id must be unique/],
		['table group', (schema: Schema) => {
			schema.tableGroups = [
				{ id: 'group-1', name: 'First', tableIds: [] },
				{ id: 'group-1', name: 'Second', tableIds: [] }
			];
		}, /schema\.tableGroups\[1\]\.id must be unique/],
		['enum', (schema: Schema) => {
			schema.enums = [
				{ id: 'enum-1', name: 'First', values: [] },
				{ id: 'enum-1', name: 'Second', values: [] }
			];
		}, /schema\.enums\[1\]\.id must be unique/]
	])('rejects duplicate %s IDs', (_label, mutate, expected) => {
		const schema = structuredClone(sampleSchema);
		mutate(schema);

		expect(() => serializeSchema(schema)).toThrowError(expected);
	});

	it.each([
		['from table', (schema: Schema) => {
			schema.relations[0].from.tableId = 'missing-table';
		}, /schema\.relations\[0\]\.from\.tableId must reference an existing table/],
		['to column', (schema: Schema) => {
			schema.relations[0].to.columnId = 'missing-column';
		}, /schema\.relations\[0\]\.to\.columnId must reference a column in table "table_users"/],
		['column on another table', (schema: Schema) => {
			schema.relations[0].from.columnId = 'col_1';
		}, /schema\.relations\[0\]\.from\.columnId must reference a column in table "table_posts"/]
	])('rejects a relation with an invalid %s reference', (_label, mutate, expected) => {
		const schema = structuredClone(sampleSchema);
		mutate(schema);

		expect(() => serializeSchema(schema)).toThrowError(expected);
	});

	it('rejects table groups that reference missing tables', () => {
		const schema = structuredClone(sampleSchema);
		schema.tableGroups = [{ id: 'group-1', name: 'Broken', tableIds: ['missing-table'] }];

		expect(() => serializeSchema(schema)).toThrowError(
			/schema\.tableGroups\[0\]\.tableIds\[0\] must reference an existing table/
		);
	});

	it('rejects tablePositions keys without a matching table in paired payloads', () => {
		const layout = structuredClone(DEFAULT_LAYOUT_STATE);
		layout.tablePositions['missing-table'] = { x: 0, y: 0 };

		expect(() =>
			parseCreateDiagramInput({
				name: 'Invalid',
				schema: structuredClone(sampleSchema),
				layout
			})
		).toThrowError(
			/layout\.tablePositions\.missing-table must reference an existing schema table/
		);
	});

	it('requires complete PUT input and non-empty PATCH input', () => {
		expect(() => parseUpdateDiagramInput({ name: 'Only a patch' }, true)).toThrow(
			DiagramValidationError
		);
		expect(() => parseUpdateDiagramInput({})).toThrow(DiagramValidationError);
	});

	it('distinguishes corrupt stored data from request validation errors', () => {
		expect(() => deserializeSchema('{not json')).toThrow(DiagramDataError);
		expect(() => deserializeLayout('{"viewport":{}}')).toThrow(DiagramDataError);
	});
});
