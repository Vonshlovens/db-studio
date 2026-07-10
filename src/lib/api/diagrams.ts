import type { LayoutState, Schema } from '$lib/types';

export interface DiagramSummary {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface Diagram extends DiagramSummary {
	schema: Schema;
	layout: LayoutState;
}

export interface DiagramPayload {
	name: string;
	schema: Schema;
	layout: LayoutState;
}

export type DiagramUpdate = Partial<DiagramPayload>;

export class DiagramApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string
	) {
		super(message);
		this.name = 'DiagramApiError';
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalid(field: string): never {
	throw new DiagramApiError(`The server returned an invalid ${field}.`, 500);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
	if (!isRecord(value)) invalid(field);
	return value;
}

function requireArray(value: unknown, field: string): unknown[] {
	if (!Array.isArray(value)) invalid(field);
	return value;
}

function requireString(value: unknown, field: string): string {
	if (typeof value !== 'string') invalid(field);
	return value;
}

function requireOptionalString(value: unknown, field: string): void {
	if (value !== undefined) requireString(value, field);
}

function requireOptionalBoolean(value: unknown, field: string): void {
	if (value !== undefined && typeof value !== 'boolean') invalid(field);
}

function requireFiniteNumber(value: unknown, field: string): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) invalid(field);
	return value;
}

function requireIsoDate(value: unknown, field: string): string {
	const date = requireString(value, field);
	try {
		if (new Date(date).toISOString() !== date) invalid(field);
	} catch {
		invalid(field);
	}
	return date;
}

function requireUniqueId(id: string, field: string, seen: Set<string>): void {
	if (seen.has(id)) invalid(field);
	seen.add(id);
}

function parseSummary(value: unknown): DiagramSummary {
	if (!isRecord(value)) {
		throw new DiagramApiError('The server returned an invalid diagram.', 500);
	}

	return {
		id: requireString(value.id, 'diagram id'),
		name: requireString(value.name, 'diagram name'),
		createdAt: requireIsoDate(value.createdAt, 'creation date'),
		updatedAt: requireIsoDate(value.updatedAt, 'update date')
	};
}

function validatePosition(value: unknown, field: string): void {
	const position = requireRecord(value, field);
	requireFiniteNumber(position.x, `${field}.x`);
	requireFiniteNumber(position.y, `${field}.y`);
}

function validateSchema(value: unknown): Schema {
	const schema = requireRecord(value, 'diagram schema');
	const tables = requireArray(schema.tables, 'diagram schema.tables');
	const relations = requireArray(schema.relations, 'diagram schema.relations');
	const groups = requireArray(schema.tableGroups, 'diagram schema.tableGroups');
	const enums = requireArray(schema.enums, 'diagram schema.enums');
	requireOptionalString(schema.notes, 'diagram schema.notes');

	const tableIds = new Set<string>();
	const columnIds = new Set<string>();
	const columnsByTable = new Map<string, Set<string>>();
	tables.forEach((tableValue, tableIndex) => {
		const field = `diagram schema.tables[${tableIndex}]`;
		const table = requireRecord(tableValue, field);
		const tableId = requireString(table.id, `${field}.id`);
		requireUniqueId(tableId, `${field}.id`, tableIds);
		requireString(table.name, `${field}.name`);
		requireOptionalString(table.alias, `${field}.alias`);
		requireOptionalString(table.note, `${field}.note`);
		requireOptionalString(table.color, `${field}.color`);
		validatePosition(table.position, `${field}.position`);

		const tableColumnIds = new Set<string>();
		requireArray(table.columns, `${field}.columns`).forEach((columnValue, columnIndex) => {
			const columnField = `${field}.columns[${columnIndex}]`;
			const column = requireRecord(columnValue, columnField);
			const columnId = requireString(column.id, `${columnField}.id`);
			requireUniqueId(columnId, `${columnField}.id`, columnIds);
			tableColumnIds.add(columnId);
			requireString(column.name, `${columnField}.name`);
			requireString(column.type, `${columnField}.type`);
			requireOptionalString(column.defaultValue, `${columnField}.defaultValue`);
			requireOptionalString(column.note, `${columnField}.note`);
			const constraints = requireRecord(column.constraints, `${columnField}.constraints`);
			for (const key of [
				'pk',
				'primaryKey',
				'fk',
				'foreignKey',
				'unique',
				'notNull',
				'nullable',
				'increment'
			]) {
				requireOptionalBoolean(constraints[key], `${columnField}.constraints.${key}`);
			}
		});
		columnsByTable.set(tableId, tableColumnIds);

		requireArray(table.indexes, `${field}.indexes`).forEach((indexValue, indexPosition) => {
			const indexField = `${field}.indexes[${indexPosition}]`;
			const index = requireRecord(indexValue, indexField);
			requireString(index.id, `${indexField}.id`);
			requireOptionalString(index.name, `${indexField}.name`);
			requireOptionalBoolean(index.unique, `${indexField}.unique`);
			requireOptionalBoolean(index.pk, `${indexField}.pk`);
			requireOptionalString(index.note, `${indexField}.note`);
			requireArray(index.columns, `${indexField}.columns`).forEach(
				(indexColumnValue, columnIndex) => {
					const indexColumnField = `${indexField}.columns[${columnIndex}]`;
					const indexColumn = requireRecord(indexColumnValue, indexColumnField);
					requireString(indexColumn.name, `${indexColumnField}.name`);
					if (
						indexColumn.sort !== undefined &&
						indexColumn.sort !== 'asc' &&
						indexColumn.sort !== 'desc'
					) {
						invalid(`${indexColumnField}.sort`);
					}
				}
			);
		});
	});

	const relationIds = new Set<string>();
	relations.forEach((relationValue, relationIndex) => {
		const field = `diagram schema.relations[${relationIndex}]`;
		const relation = requireRecord(relationValue, field);
		requireUniqueId(requireString(relation.id, `${field}.id`), `${field}.id`, relationIds);
		requireOptionalString(relation.name, `${field}.name`);
		requireOptionalString(relation.note, `${field}.note`);
		if (
			relation.type !== 'one-to-one' &&
			relation.type !== 'one-to-many' &&
			relation.type !== 'many-to-one' &&
			relation.type !== 'many-to-many'
		) {
			invalid(`${field}.type`);
		}
		for (const endpointName of ['from', 'to'] as const) {
			const endpointField = `${field}.${endpointName}`;
			const endpoint = requireRecord(relation[endpointName], endpointField);
			const tableId = requireString(endpoint.tableId, `${endpointField}.tableId`);
			const columnId = requireString(endpoint.columnId, `${endpointField}.columnId`);
			const tableColumns = columnsByTable.get(tableId);
			if (!tableColumns) invalid(`${endpointField}.tableId`);
			if (!tableColumns.has(columnId)) invalid(`${endpointField}.columnId`);
		}
	});

	const groupIds = new Set<string>();
	groups.forEach((groupValue, groupIndex) => {
		const field = `diagram schema.tableGroups[${groupIndex}]`;
		const group = requireRecord(groupValue, field);
		requireUniqueId(requireString(group.id, `${field}.id`), `${field}.id`, groupIds);
		requireString(group.name, `${field}.name`);
		requireOptionalString(group.color, `${field}.color`);
		requireOptionalString(group.note, `${field}.note`);
		requireArray(group.tableIds, `${field}.tableIds`).forEach((tableIdValue, tableIndex) => {
			const tableId = requireString(tableIdValue, `${field}.tableIds[${tableIndex}]`);
			if (!tableIds.has(tableId)) invalid(`${field}.tableIds[${tableIndex}]`);
		});
	});

	const enumIds = new Set<string>();
	enums.forEach((enumValue, enumIndex) => {
		const field = `diagram schema.enums[${enumIndex}]`;
		const enumType = requireRecord(enumValue, field);
		requireUniqueId(requireString(enumType.id, `${field}.id`), `${field}.id`, enumIds);
		requireString(enumType.name, `${field}.name`);
		requireOptionalString(enumType.note, `${field}.note`);
		requireArray(enumType.values, `${field}.values`).forEach((itemValue, itemIndex) => {
			const itemField = `${field}.values[${itemIndex}]`;
			const item = requireRecord(itemValue, itemField);
			requireString(item.name, `${itemField}.name`);
			requireOptionalString(item.note, `${itemField}.note`);
		});
	});

	return schema as unknown as Schema;
}

function validateLayout(value: unknown, tableIds: ReadonlySet<string>): LayoutState {
	const layout = requireRecord(value, 'diagram layout');
	const viewport = requireRecord(layout.viewport, 'diagram layout.viewport');
	requireFiniteNumber(viewport.x, 'diagram layout.viewport.x');
	requireFiniteNumber(viewport.y, 'diagram layout.viewport.y');
	const zoom = requireFiniteNumber(viewport.zoom, 'diagram layout.viewport.zoom');
	if (zoom < 0.1 || zoom > 3) invalid('diagram layout.viewport.zoom');

	const tablePositions = requireRecord(layout.tablePositions, 'diagram layout.tablePositions');
	for (const [tableId, position] of Object.entries(tablePositions)) {
		if (!tableIds.has(tableId)) invalid(`diagram layout.tablePositions.${tableId}`);
		validatePosition(position, `diagram layout.tablePositions.${tableId}`);
	}

	if (typeof layout.showGrid !== 'boolean') invalid('diagram layout.showGrid');
	const gridSize = requireFiniteNumber(layout.gridSize, 'diagram layout.gridSize');
	if (gridSize <= 0 || gridSize > 1000) invalid('diagram layout.gridSize');
	if (typeof layout.snapToGrid !== 'boolean') invalid('diagram layout.snapToGrid');
	return layout as unknown as LayoutState;
}

function parseDiagram(value: unknown): Diagram {
	const diagram = requireRecord(value, 'diagram');
	const schema = validateSchema(diagram.schema);
	const layout = validateLayout(diagram.layout, new Set(schema.tables.map((table) => table.id)));
	return {
		...parseSummary(diagram),
		schema,
		layout
	};
}

async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
	const response = await fetch(path, {
		...init,
		headers: init?.body
			? { 'content-type': 'application/json', ...init.headers }
			: init?.headers
	});

	if (response.ok) {
		if (response.status === 204) return undefined;
		try {
			return await response.json();
		} catch {
			throw new DiagramApiError('The server returned invalid JSON.', 500);
		}
	}

	let message = 'Something went wrong. Please try again.';
	let code: string | undefined;
	try {
		const body: unknown = await response.json();
		if (isRecord(body) && isRecord(body.error)) {
			if (typeof body.error.message === 'string') message = body.error.message;
			if (typeof body.error.code === 'string') code = body.error.code;
		}
	} catch {
		// Keep the generic message when the server did not return JSON.
	}

	throw new DiagramApiError(message, response.status, code);
}

export async function listDiagrams(): Promise<DiagramSummary[]> {
	const body = await apiRequest('/api/diagrams');
	if (!isRecord(body) || !Array.isArray(body.diagrams)) {
		throw new DiagramApiError('The server returned an invalid diagram list.', 500);
	}
	return body.diagrams.map(parseSummary);
}

export async function createDiagram(payload: DiagramPayload): Promise<Diagram> {
	const body = await apiRequest('/api/diagrams', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
	if (!isRecord(body)) {
		throw new DiagramApiError('The server returned an invalid diagram.', 500);
	}
	return parseDiagram(body.diagram);
}

export async function getDiagram(id: string): Promise<Diagram> {
	const body = await apiRequest(`/api/diagrams/${encodeURIComponent(id)}`);
	if (!isRecord(body)) {
		throw new DiagramApiError('The server returned an invalid diagram.', 500);
	}
	return parseDiagram(body.diagram);
}

export async function updateDiagram(id: string, update: DiagramUpdate): Promise<Diagram> {
	const body = await apiRequest(`/api/diagrams/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		body: JSON.stringify(update)
	});
	if (!isRecord(body)) {
		throw new DiagramApiError('The server returned an invalid diagram.', 500);
	}
	return parseDiagram(body.diagram);
}

export async function deleteDiagram(id: string): Promise<void> {
	await apiRequest(`/api/diagrams/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
