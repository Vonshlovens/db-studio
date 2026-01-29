/**
 * DBML Generator
 * Converts internal Schema representation to DBML text
 */

import type { Schema, Table, Column, Relation } from '$lib/types';

// ============================================================================
// Generator Class
// ============================================================================

export class DBMLGenerator {
	private indent: string = '  ';

	// ============================================================================
	// Public API
	// ============================================================================

	generate(schema: Schema): string {
		const lines: string[] = [];

		// Generate tables
		for (const table of schema.tables) {
			lines.push(this.generateTable(table));
			lines.push('');
		}

		// Generate relations (as separate Ref statements)
		for (const relation of schema.relations) {
			lines.push(this.generateRelation(relation));
		}

		// Generate table groups
		for (const group of schema.tableGroups) {
			lines.push(this.generateTableGroup(group));
			lines.push('');
		}

		return lines.join('\n').trim();
	}

	generateTable(table: Table): string {
		const lines: string[] = [];

		// Table header
		if (table.alias) {
			lines.push(`Table ${this.escapeIdentifier(table.name)} as ${this.escapeIdentifier(table.alias)} {`);
		} else {
			lines.push(`Table ${this.escapeIdentifier(table.name)} {`);
		}

		// Note if present
		if (table.note) {
			lines.push(`${this.indent}note: '${this.escapeString(table.note)}'`);
			lines.push('');
		}

		// Columns
		for (const column of table.columns) {
			lines.push(this.generateColumn(column));
		}

		lines.push('}');

		return lines.join('\n');
	}

	generateColumn(column: Column): string {
		let line = this.indent;
		line += this.escapeIdentifier(column.name);
		line += ' ' + column.type;

		// Generate constraints
		const constraints: string[] = [];

		if (column.constraints.pk || column.constraints.primaryKey) {
			constraints.push('pk');
		}

		if (column.constraints.notNull) {
			constraints.push('not null');
		}

		if (column.constraints.unique) {
			constraints.push('unique');
		}

		if (column.constraints.increment) {
			constraints.push('increment');
		}

		if (column.defaultValue !== undefined) {
			constraints.push(`default: '${this.escapeString(column.defaultValue)}'`);
		}

		if (column.note) {
			constraints.push(`note: '${this.escapeString(column.note)}'`);
		}

		if (constraints.length > 0) {
			line += ` [${constraints.join(', ')}]`;
		}

		return line;
	}

	generateRelation(relation: Relation): string {
		// Format: Ref name { from_table.from_col > to_table.to_col }
		const fromRef = `${relation.from.tableId}.${relation.from.columnId}`;
		const toRef = `${relation.to.tableId}.${relation.to.columnId}`;

		let symbol: string;
		switch (relation.type) {
			case 'one-to-one':
				symbol = '-';
				break;
			case 'one-to-many':
				symbol = '<';
				break;
			case 'many-to-one':
				symbol = '>';
				break;
			case 'many-to-many':
				symbol = '<>';
				break;
			default:
				symbol = '>';
		}

		if (relation.name) {
			return `Ref ${this.escapeIdentifier(relation.name)} {\n${this.indent}${fromRef} ${symbol} ${toRef}\n}`;
		} else {
			return `Ref {\n${this.indent}${fromRef} ${symbol} ${toRef}\n}`;
		}
	}

	generateTableGroup(group: { name: string; tableIds: string[] }): string {
		const lines: string[] = [];
		lines.push(`TableGroup ${this.escapeIdentifier(group.name)} {`);

		for (const tableId of group.tableIds) {
			lines.push(`${this.indent}${this.escapeIdentifier(tableId)}`);
		}

		lines.push('}');
		return lines.join('\n');
	}

	// ============================================================================
	// Helper Methods
	// ============================================================================

	private escapeIdentifier(name: string): string {
		// If name contains spaces or special chars, wrap in backticks
		if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
			return name;
		}
		return `\`${name}\``;
	}

	private escapeString(str: string): string {
		return str.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
	}
}

// ============================================================================
// Convenience function
// ============================================================================

export function generateDBML(schema: Schema): string {
	const generator = new DBMLGenerator();
	return generator.generate(schema);
}
