import type {
	Column,
	ColumnConstraints,
	EnumType,
	Index,
	LayoutState,
	Position,
	Relation,
	Schema,
	Table,
	TableGroup
} from '$lib/types';

const MAX_DIAGRAM_NAME_LENGTH = 200;
const MIN_VIEWPORT_ZOOM = 0.1;
const MAX_VIEWPORT_ZOOM = 3;
const MAX_GRID_SIZE = 1000;
const RELATION_TYPES = new Set(['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many']);

export class DiagramValidationError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'DiagramValidationError';
	}
}

export class DiagramDataError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'DiagramDataError';
	}
}

function fail(path: string, expectation: string): never {
	throw new DiagramValidationError(`${path} ${expectation}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
	if (!isRecord(value)) fail(path, 'must be an object');
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
	if (!Array.isArray(value)) fail(path, 'must be an array');
}

function assertString(value: unknown, path: string): asserts value is string {
	if (typeof value !== 'string') fail(path, 'must be a string');
}

function assertBoolean(value: unknown, path: string): asserts value is boolean {
	if (typeof value !== 'boolean') fail(path, 'must be a boolean');
}

function assertFiniteNumber(value: unknown, path: string): asserts value is number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		fail(path, 'must be a finite number');
	}
}

function assertOptionalString(value: unknown, path: string): asserts value is string | undefined {
	if (value !== undefined) assertString(value, path);
}

function assertPosition(value: unknown, path: string): asserts value is Position {
	assertRecord(value, path);
	assertFiniteNumber(value.x, `${path}.x`);
	assertFiniteNumber(value.y, `${path}.y`);
}

function assertConstraints(value: unknown, path: string): asserts value is ColumnConstraints {
	assertRecord(value, path);
	for (const key of [
		'pk',
		'primaryKey',
		'fk',
		'foreignKey',
		'unique',
		'notNull',
		'nullable',
		'increment'
	] as const) {
		const constraint = value[key];
		if (constraint !== undefined) assertBoolean(constraint, `${path}.${key}`);
	}
}

function assertColumn(value: unknown, path: string): asserts value is Column {
	assertRecord(value, path);
	assertString(value.id, `${path}.id`);
	assertString(value.name, `${path}.name`);
	assertString(value.type, `${path}.type`);
	assertConstraints(value.constraints, `${path}.constraints`);
	assertOptionalString(value.defaultValue, `${path}.defaultValue`);
	assertOptionalString(value.note, `${path}.note`);
}

function assertIndex(value: unknown, path: string): asserts value is Index {
	assertRecord(value, path);
	assertString(value.id, `${path}.id`);
	assertOptionalString(value.name, `${path}.name`);
	assertArray(value.columns, `${path}.columns`);
	value.columns.forEach((column, index) => {
		const columnPath = `${path}.columns[${index}]`;
		assertRecord(column, columnPath);
		assertString(column.name, `${columnPath}.name`);
		if (column.sort !== undefined && column.sort !== 'asc' && column.sort !== 'desc') {
			fail(`${columnPath}.sort`, 'must be "asc" or "desc"');
		}
	});
	for (const key of ['unique', 'pk'] as const) {
		const flag = value[key];
		if (flag !== undefined) assertBoolean(flag, `${path}.${key}`);
	}
	assertOptionalString(value.note, `${path}.note`);
}

function assertTable(value: unknown, path: string): asserts value is Table {
	assertRecord(value, path);
	assertString(value.id, `${path}.id`);
	assertString(value.name, `${path}.name`);
	assertOptionalString(value.alias, `${path}.alias`);
	assertOptionalString(value.note, `${path}.note`);
	assertArray(value.columns, `${path}.columns`);
	value.columns.forEach((column, index) => assertColumn(column, `${path}.columns[${index}]`));
	assertArray(value.indexes, `${path}.indexes`);
	value.indexes.forEach((tableIndex, index) => assertIndex(tableIndex, `${path}.indexes[${index}]`));
	assertPosition(value.position, `${path}.position`);
	assertOptionalString(value.color, `${path}.color`);
}

function assertRelation(value: unknown, path: string): asserts value is Relation {
	assertRecord(value, path);
	assertString(value.id, `${path}.id`);
	assertOptionalString(value.name, `${path}.name`);

	for (const endpointName of ['from', 'to'] as const) {
		const endpoint = value[endpointName];
		const endpointPath = `${path}.${endpointName}`;
		assertRecord(endpoint, endpointPath);
		assertString(endpoint.tableId, `${endpointPath}.tableId`);
		assertString(endpoint.columnId, `${endpointPath}.columnId`);
	}

	if (typeof value.type !== 'string' || !RELATION_TYPES.has(value.type)) {
		fail(`${path}.type`, 'must be a supported relation type');
	}
	assertOptionalString(value.note, `${path}.note`);
}

function assertTableGroup(value: unknown, path: string): asserts value is TableGroup {
	assertRecord(value, path);
	assertString(value.id, `${path}.id`);
	assertString(value.name, `${path}.name`);
	assertArray(value.tableIds, `${path}.tableIds`);
	value.tableIds.forEach((tableId, index) =>
		assertString(tableId, `${path}.tableIds[${index}]`)
	);
	assertOptionalString(value.color, `${path}.color`);
	assertOptionalString(value.note, `${path}.note`);
}

function assertEnum(value: unknown, path: string): asserts value is EnumType {
	assertRecord(value, path);
	assertString(value.id, `${path}.id`);
	assertString(value.name, `${path}.name`);
	assertArray(value.values, `${path}.values`);
	value.values.forEach((enumValue, index) => {
		const valuePath = `${path}.values[${index}]`;
		assertRecord(enumValue, valuePath);
		assertString(enumValue.name, `${valuePath}.name`);
		assertOptionalString(enumValue.note, `${valuePath}.note`);
	});
	assertOptionalString(value.note, `${path}.note`);
}

export function assertSchema(value: unknown, path = 'schema'): asserts value is Schema {
	assertRecord(value, path);
	assertArray(value.tables, `${path}.tables`);
	value.tables.forEach((table, index) => assertTable(table, `${path}.tables[${index}]`));
	assertArray(value.relations, `${path}.relations`);
	value.relations.forEach((relation, index) =>
		assertRelation(relation, `${path}.relations[${index}]`)
	);
	assertArray(value.tableGroups, `${path}.tableGroups`);
	value.tableGroups.forEach((group, index) =>
		assertTableGroup(group, `${path}.tableGroups[${index}]`)
	);
	assertArray(value.enums, `${path}.enums`);
	value.enums.forEach((enumType, index) => assertEnum(enumType, `${path}.enums[${index}]`));
	assertOptionalString(value.notes, `${path}.notes`);

	const schema = value as unknown as Schema;
	const tableIds = new Map<string, string>();
	const columnsByTable = new Map<string, Set<string>>();
	const columnIds = new Map<string, string>();
	schema.tables.forEach((table, tableIndex) => {
		const tablePath = `${path}.tables[${tableIndex}]`;
		assertUniqueId(table.id, `${tablePath}.id`, tableIds);

		const tableColumnIds = new Set<string>();
		table.columns.forEach((column, columnIndex) => {
			const columnPath = `${tablePath}.columns[${columnIndex}].id`;
			assertUniqueId(column.id, columnPath, columnIds);
			tableColumnIds.add(column.id);
		});
		columnsByTable.set(table.id, tableColumnIds);
	});

	const relationIds = new Map<string, string>();
	schema.relations.forEach((relation, relationIndex) => {
		const relationPath = `${path}.relations[${relationIndex}]`;
		assertUniqueId(relation.id, `${relationPath}.id`, relationIds);
		for (const endpointName of ['from', 'to'] as const) {
			const endpoint = relation[endpointName];
			const endpointPath = `${relationPath}.${endpointName}`;
			const tableColumns = columnsByTable.get(endpoint.tableId);
			if (!tableColumns) {
				fail(`${endpointPath}.tableId`, 'must reference an existing table');
			}
			if (!tableColumns.has(endpoint.columnId)) {
				fail(
					`${endpointPath}.columnId`,
					`must reference a column in table "${endpoint.tableId}"`
				);
			}
		}
	});

	const groupIds = new Map<string, string>();
	schema.tableGroups.forEach((group, groupIndex) => {
		const groupPath = `${path}.tableGroups[${groupIndex}]`;
		assertUniqueId(group.id, `${groupPath}.id`, groupIds);
		group.tableIds.forEach((tableId, tableIndex) => {
			if (!tableIds.has(tableId)) {
				fail(`${groupPath}.tableIds[${tableIndex}]`, 'must reference an existing table');
			}
		});
	});

	const enumIds = new Map<string, string>();
	schema.enums.forEach((enumType, enumIndex) =>
		assertUniqueId(enumType.id, `${path}.enums[${enumIndex}].id`, enumIds)
	);
}

function assertUniqueId(id: string, path: string, seen: Map<string, string>): void {
	const firstPath = seen.get(id);
	if (firstPath) fail(path, `must be unique (already used at ${firstPath})`);
	seen.set(id, path);
}

export function assertLayoutState(
	value: unknown,
	path = 'layout',
	tableIds?: ReadonlySet<string>
): asserts value is LayoutState {
	assertRecord(value, path);
	assertRecord(value.viewport, `${path}.viewport`);
	assertFiniteNumber(value.viewport.x, `${path}.viewport.x`);
	assertFiniteNumber(value.viewport.y, `${path}.viewport.y`);
	assertFiniteNumber(value.viewport.zoom, `${path}.viewport.zoom`);
	if (value.viewport.zoom < MIN_VIEWPORT_ZOOM || value.viewport.zoom > MAX_VIEWPORT_ZOOM) {
		fail(
			`${path}.viewport.zoom`,
			`must be between ${MIN_VIEWPORT_ZOOM} and ${MAX_VIEWPORT_ZOOM}`
		);
	}

	assertRecord(value.tablePositions, `${path}.tablePositions`);
	for (const [tableId, position] of Object.entries(value.tablePositions)) {
		const positionPath = `${path}.tablePositions.${tableId}`;
		if (tableIds && !tableIds.has(tableId)) {
			fail(positionPath, 'must reference an existing schema table');
		}
		assertPosition(position, positionPath);
	}

	assertBoolean(value.showGrid, `${path}.showGrid`);
	assertFiniteNumber(value.gridSize, `${path}.gridSize`);
	if (value.gridSize <= 0 || value.gridSize > MAX_GRID_SIZE) {
		fail(`${path}.gridSize`, `must be greater than 0 and at most ${MAX_GRID_SIZE}`);
	}
	assertBoolean(value.snapToGrid, `${path}.snapToGrid`);
}

export function normalizeDiagramName(value: unknown, path = 'name'): string {
	assertString(value, path);
	const name = value.trim();
	if (name.length === 0) fail(path, 'must not be empty');
	if (name.length > MAX_DIAGRAM_NAME_LENGTH) {
		fail(path, `must be at most ${MAX_DIAGRAM_NAME_LENGTH} characters`);
	}
	return name;
}

export function serializeSchema(value: unknown): string {
	assertSchema(value);
	return JSON.stringify(value);
}

export function serializeLayout(value: unknown): string {
	assertLayoutState(value);
	return JSON.stringify(value);
}

function parseStoredJson(value: string, label: string): unknown {
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new DiagramDataError(`Stored ${label} is not valid JSON`, { cause: error });
	}
}

export function deserializeSchema(value: string): Schema {
	const parsed = parseStoredJson(value, 'schema');
	try {
		assertSchema(parsed);
	} catch (error) {
		throw new DiagramDataError('Stored schema does not match the Schema shape', { cause: error });
	}
	return parsed;
}

export function deserializeLayout(value: string): LayoutState {
	const parsed = parseStoredJson(value, 'layout');
	try {
		assertLayoutState(parsed);
	} catch (error) {
		throw new DiagramDataError('Stored layout does not match the LayoutState shape', {
			cause: error
		});
	}
	return parsed;
}

export interface CreateDiagramInput {
	name: string;
	schema: Schema;
	layout: LayoutState;
}

export interface UpdateDiagramInput {
	name?: string;
	schema?: Schema;
	layout?: LayoutState;
}

export function parseCreateDiagramInput(value: unknown): CreateDiagramInput {
	assertRecord(value, 'body');
	const name = normalizeDiagramName(value.name);
	assertSchema(value.schema);
	assertLayoutState(value.layout, 'layout', new Set(value.schema.tables.map((table) => table.id)));
	return { name, schema: value.schema, layout: value.layout };
}

export function parseUpdateDiagramInput(value: unknown, requireAll = false): UpdateDiagramInput {
	assertRecord(value, 'body');

	const result: UpdateDiagramInput = {};
	if (value.name !== undefined) result.name = normalizeDiagramName(value.name);
	if (value.schema !== undefined) {
		assertSchema(value.schema);
		result.schema = value.schema;
	}
	if (value.layout !== undefined) {
		assertLayoutState(value.layout);
		result.layout = value.layout;
	}
	if (result.schema && result.layout) {
		assertLayoutState(
			result.layout,
			'layout',
			new Set(result.schema.tables.map((table) => table.id))
		);
	}

	if (requireAll && (result.name === undefined || !result.schema || !result.layout)) {
		fail('body', 'must include name, schema, and layout');
	}
	if (Object.keys(result).length === 0) {
		fail('body', 'must include at least one of name, schema, or layout');
	}

	return result;
}
