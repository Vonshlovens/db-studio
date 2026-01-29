/**
 * Core type definitions for DB Studio
 * Based on the DBML specification
 */

// ============================================================================
// Column Constraints
// ============================================================================

export interface ColumnConstraints {
	pk?: boolean;
	primaryKey?: boolean;
	fk?: boolean;
	foreignKey?: boolean;
	unique?: boolean;
	notNull?: boolean;
	nullable?: boolean;
	increment?: boolean;
}

// ============================================================================
// Column
// ============================================================================

export interface Column {
	id: string;
	name: string;
	type: string;
	constraints: ColumnConstraints;
	defaultValue?: string;
	note?: string;
}

// ============================================================================
// Index
// ============================================================================

export interface IndexColumn {
	name: string;
	sort?: 'asc' | 'desc';
}

export interface Index {
	id: string;
	name?: string;
	columns: IndexColumn[];
	unique?: boolean;
	pk?: boolean;
	note?: string;
}

// ============================================================================
// Table
// ============================================================================

export interface Table {
	id: string;
	name: string;
	alias?: string;
	note?: string;
	columns: Column[];
	indexes: Index[];
	// Layout properties
	position: Position;
	color?: string;
}

// ============================================================================
// Relation Type
// ============================================================================

export type RelationType = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

// ============================================================================
// Relation
// ============================================================================

export interface RelationEndpoint {
	tableId: string;
	columnId: string;
}

export interface Relation {
	id: string;
	name?: string;
	from: RelationEndpoint;
	to: RelationEndpoint;
	type: RelationType;
	note?: string;
}

// ============================================================================
// Table Group
// ============================================================================

export interface TableGroup {
	id: string;
	name: string;
	tableIds: string[];
	color?: string;
	note?: string;
}

// ============================================================================
// Enum Value
// ============================================================================

export interface EnumValue {
	name: string;
	note?: string;
}

// ============================================================================
// Enum
// ============================================================================

export interface EnumType {
	id: string;
	name: string;
	values: EnumValue[];
	note?: string;
}

// ============================================================================
// Schema (Root object)
// ============================================================================

export interface Schema {
	tables: Table[];
	relations: Relation[];
	tableGroups: TableGroup[];
	enums: EnumType[];
	notes?: string;
}

// ============================================================================
// Layout
// ============================================================================

export interface Position {
	x: number;
	y: number;
}

export interface ViewportState {
	x: number;
	y: number;
	zoom: number;
}

export interface LayoutState {
	viewport: ViewportState;
	tablePositions: Record<string, Position>;
	showGrid: boolean;
	gridSize: number;
	snapToGrid: boolean;
}

// ============================================================================
// UI State
// ============================================================================

export interface UIState {
	selectedTableId: string | null;
	selectedRelationId: string | null;
	selectedGroupId: string | null;
	editingTableId: string | null;
	contextMenu: {
		visible: boolean;
		x: number;
		y: number;
		type: 'table' | 'canvas' | 'relation' | null;
		targetId: string | null;
	} | null;
}

// ============================================================================
// App State (Combined)
// ============================================================================

export interface AppState {
	schema: Schema;
	layout: LayoutState;
	ui: UIState;
}

// ============================================================================
// Parser/Generator Types
// ============================================================================

export interface ParseError {
	line: number;
	column: number;
	message: string;
	type: 'error' | 'warning';
}

export interface ParseResult {
	schema: Schema | null;
	errors: ParseError[];
}

// ============================================================================
// Default values
// ============================================================================

export const DEFAULT_LAYOUT_STATE: LayoutState = {
	viewport: {
		x: 0,
		y: 0,
		zoom: 1
	},
	tablePositions: {},
	showGrid: true,
	gridSize: 20,
	snapToGrid: true
};

export const DEFAULT_UI_STATE: UIState = {
	selectedTableId: null,
	selectedRelationId: null,
	selectedGroupId: null,
	editingTableId: null,
	contextMenu: null
};

export const DEFAULT_SCHEMA: Schema = {
	tables: [],
	relations: [],
	tableGroups: [],
	enums: []
};
