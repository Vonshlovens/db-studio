/**
 * Schema and Layout State Management
 * Uses Svelte 5 runes for reactive state
 */

import type {
	Schema,
	Table,
	Column,
	Relation,
	TableGroup,
	LayoutState,
	UIState,
	Position,
	ViewportState,
	ParseResult
} from '$lib/types';
import { DEFAULT_SCHEMA, DEFAULT_LAYOUT_STATE, DEFAULT_UI_STATE } from '$lib/types';

export interface PersistenceSnapshot {
	schema: Schema;
	layout: LayoutState;
}

function clonePlain<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

// ============================================================================
// State Classes
// ============================================================================

class SchemaStore {
	// Private state using Svelte 5 runes
	#schema = $state<Schema>(clonePlain(DEFAULT_SCHEMA));
	#layout = $state<LayoutState>(clonePlain(DEFAULT_LAYOUT_STATE));
	#ui = $state<UIState>(clonePlain(DEFAULT_UI_STATE));

	// ============================================================================
	// Getters
	// ============================================================================

	get schema(): Schema {
		return this.#schema;
	}

	get layout(): LayoutState {
		return this.#layout;
	}

	get ui(): UIState {
		return this.#ui;
	}

	get tables(): Table[] {
		return this.#schema.tables;
	}

	get relations(): Relation[] {
		return this.#schema.relations;
	}

	get tableGroups(): TableGroup[] {
		return this.#schema.tableGroups;
	}

	get selectedTable(): Table | null {
		if (!this.#ui.selectedTableId) return null;
		return this.#schema.tables.find(t => t.id === this.#ui.selectedTableId) ?? null;
	}

	get viewport(): ViewportState {
		return this.#layout.viewport;
	}

	// ============================================================================
	// Schema Actions
	// ============================================================================

	setSchema(schema: Schema) {
		this.#schema = schema;
	}

	loadPersistedState(schema: Schema, layout: LayoutState) {
		const nextSchema = clonePlain(schema);
		const nextLayout = clonePlain(layout);

		for (const table of nextSchema.tables) {
			const persistedPosition = nextLayout.tablePositions[table.id];
			if (persistedPosition) table.position = clonePlain(persistedPosition);
		}

		this.#schema = nextSchema;
		this.#layout = nextLayout;
		this.resetTransientUI();
	}

	getPersistenceSnapshot(): PersistenceSnapshot {
		return {
			schema: clonePlain(this.#schema),
			layout: clonePlain(this.#layout)
		};
	}

	importParseResult(result: ParseResult) {
		if (result.schema) {
			this.#schema = result.schema;
			// Initialize default positions for tables without positions
			this.#initializePositions();
			this.#layout.tablePositions = Object.fromEntries(
				this.#schema.tables.map((table) => [table.id, clonePlain(table.position)])
			);
			this.resetTransientUI();
		}
	}

	clearSchema() {
		this.#schema = clonePlain(DEFAULT_SCHEMA);
		this.#layout = clonePlain(DEFAULT_LAYOUT_STATE);
		this.resetTransientUI();
	}

	// ============================================================================
	// Table Actions
	// ============================================================================

	addTable(table: Table) {
		this.#schema.tables.push(table);
		this.#layout.tablePositions[table.id] = clonePlain(table.position);
	}

	updateTable(tableId: string, updates: Partial<Table>) {
		const table = this.#schema.tables.find(t => t.id === tableId);
		if (table) {
			Object.assign(table, updates);
		}
	}

	removeTable(tableId: string) {
		this.#schema.tables = this.#schema.tables.filter(t => t.id !== tableId);
		delete this.#layout.tablePositions[tableId];
		// Also remove related relations
		this.#schema.relations = this.#schema.relations.filter(
			r => r.from.tableId !== tableId && r.to.tableId !== tableId
		);
	}

	moveTable(tableId: string, position: Position) {
		const table = this.#schema.tables.find(t => t.id === tableId);
		if (table) {
			table.position = position;
			this.#layout.tablePositions[tableId] = clonePlain(position);
		}
	}

	// ============================================================================
	// Column Actions
	// ============================================================================

	addColumn(tableId: string, column: Column) {
		const table = this.#schema.tables.find(t => t.id === tableId);
		if (table) {
			table.columns.push(column);
		}
	}

	updateColumn(tableId: string, columnId: string, updates: Partial<Column>) {
		const table = this.#schema.tables.find(t => t.id === tableId);
		if (table) {
			const column = table.columns.find(c => c.id === columnId);
			if (column) {
				Object.assign(column, updates);
			}
		}
	}

	removeColumn(tableId: string, columnId: string) {
		const table = this.#schema.tables.find(t => t.id === tableId);
		if (table) {
			table.columns = table.columns.filter(c => c.id !== columnId);
		}
	}

	// ============================================================================
	// Relation Actions
	// ============================================================================

	addRelation(relation: Relation) {
		this.#schema.relations.push(relation);
	}

	removeRelation(relationId: string) {
		this.#schema.relations = this.#schema.relations.filter(r => r.id !== relationId);
	}

	// ============================================================================
	// Layout Actions
	// ============================================================================

	setViewport(viewport: ViewportState) {
		this.#layout.viewport = viewport;
	}

	pan(dx: number, dy: number) {
		this.#layout.viewport.x += dx;
		this.#layout.viewport.y += dy;
	}

	zoom(factor: number, centerX?: number, centerY?: number) {
		const oldZoom = this.#layout.viewport.zoom;
		const newZoom = Math.max(0.1, Math.min(3, oldZoom * factor));

		// Zoom towards center point if provided
		if (centerX !== undefined && centerY !== undefined) {
			const zoomRatio = newZoom / oldZoom;
			this.#layout.viewport.x = centerX - (centerX - this.#layout.viewport.x) * zoomRatio;
			this.#layout.viewport.y = centerY - (centerY - this.#layout.viewport.y) * zoomRatio;
		}

		this.#layout.viewport.zoom = newZoom;
	}

	resetZoom() {
		this.#layout.viewport.zoom = 1;
	}

	resetViewport() {
		this.#layout.viewport = { x: 0, y: 0, zoom: 1 };
	}

	toggleGrid() {
		this.#layout.showGrid = !this.#layout.showGrid;
	}

	toggleSnapToGrid() {
		this.#layout.snapToGrid = !this.#layout.snapToGrid;
	}

	// ============================================================================
	// UI Actions
	// ============================================================================

	selectTable(tableId: string | null) {
		this.#ui.selectedTableId = tableId;
		this.#ui.selectedRelationId = null;
	}

	selectRelation(relationId: string | null) {
		this.#ui.selectedRelationId = relationId;
		this.#ui.selectedTableId = null;
	}

	clearSelection() {
		this.#ui.selectedTableId = null;
		this.#ui.selectedRelationId = null;
		this.#ui.selectedGroupId = null;
	}

	resetTransientUI() {
		this.#ui = clonePlain(DEFAULT_UI_STATE);
	}

	startEditingTable(tableId: string | null) {
		this.#ui.editingTableId = tableId;
	}

	// ============================================================================
	// Private Methods
	// ============================================================================

	#initializePositions() {
		// Grid layout for initial positioning
		const cols = 3;
		const spacingX = 300;
		const spacingY = 200;

		this.#schema.tables.forEach((table, index) => {
			if (table.position.x === 0 && table.position.y === 0) {
				const col = index % cols;
				const row = Math.floor(index / cols);
				table.position = {
					x: col * spacingX + 50,
					y: row * spacingY + 50
				};
			}
		});
	}
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const schemaStore = new SchemaStore();
