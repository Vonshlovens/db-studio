/**
 * DBML Parser
 * Converts DBML text to internal Schema representation
 * This is a skeleton implementation that handles basic cases
 */

import type {
	Column,
	ColumnConstraints,
	ParseError,
	ParseResult,
	RelationType,
	Schema,
	Table
} from '$lib/types';

interface PendingRef {
	fromTable: string;
	fromColumn: string;
	toTable: string;
	toColumn: string;
	type: RelationType;
	name?: string;
	line: number;
	column: number;
}

interface TableColumnRef {
	table: string;
	column: string;
}

// ============================================================================
// Parser Class
// ============================================================================

export class DBMLParser {
	private input: string = '';
	private errors: ParseError[] = [];
	private line: number = 1;
	private column: number = 1;
	private pos: number = 0;
	private pendingRefs: PendingRef[] = [];

	// ============================================================================
	// Public API
	// ============================================================================

	parse(input: string): ParseResult {
		this.input = input;
		this.errors = [];
		this.line = 1;
		this.column = 1;
		this.pos = 0;
		this.pendingRefs = [];

		// Handle empty input
		if (!input || input.trim().length === 0) {
			return {
				schema: null,
				errors: [{
					line: 1,
					column: 1,
					message: 'Empty input',
					type: 'error'
				}]
			};
		}

		try {
			const schema = this.parseSchema();
			return {
				schema,
				errors: this.errors
			};
		} catch (e) {
			this.addError(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
			return {
				schema: null,
				errors: this.errors
			};
		}
	}

	// ============================================================================
	// Main Parsing Methods
	// ============================================================================

	private parseSchema(): Schema {
		const schema: Schema = {
			tables: [],
			relations: [],
			tableGroups: [],
			enums: []
		};

		this.skipWhitespace();

		while (this.pos < this.input.length) {
			this.skipWhitespace();
			if (this.pos >= this.input.length) break;

			// Try to parse different top-level constructs
			if (this.matchKeyword('Table')) {
				const table = this.parseTable();
				if (table) {
					schema.tables.push(table);
				}
			} else if (this.matchKeyword('Ref')) {
				this.parseRefStatement();
			} else if (this.matchKeyword('TableGroup')) {
				this.skipUntilOpeningBrace();
				this.skipUntilBlockEnd();
			} else if (this.matchKeyword('Enum')) {
				this.skipUntilOpeningBrace();
				this.skipUntilBlockEnd();
			} else if (this.matchKeyword('Project')) {
				this.skipUntilOpeningBrace();
				this.skipUntilBlockEnd();
			} else {
				this.skipLine();
			}
		}

		this.resolvePendingRelations(schema);
		return schema;
	}

	private parseTable(): Table | null {
		// Skip 'Table' keyword
		this.advance(5);
		this.skipWhitespace();

		// Parse table name
		const name = this.parseIdentifier();
		if (!name) {
			this.addError('Expected table name');
			return null;
		}

		// Check for alias
		let alias: string | undefined;
		this.skipWhitespace();
		if (this.peek() === 'a') {
			const maybeAs = this.input.substring(this.pos, this.pos + 2);
			if (maybeAs === 'as') {
				this.advance(2);
				this.skipWhitespace();
				alias = this.parseIdentifier();
			}
		}

		this.skipWhitespace();

		// Expect opening brace
		if (this.peek() !== '{') {
			this.addError('Expected "{" after table name');
			return null;
		}
		this.advance(1);

		const table: Table = {
			id: this.generateId('table'),
			name,
			alias,
			columns: [],
			indexes: [],
			position: { x: 0, y: 0 }
		};

		// Parse columns
		while (this.pos < this.input.length && this.peek() !== '}') {
			this.skipWhitespace();
			if (this.peek() === '}') break;

			// Skip empty lines and comments
			if (this.peek() === '\n' || this.peek() === '/' || this.peek() === '#') {
				this.skipLine();
				continue;
			}

			if (this.matchKeyword('indexes') && /^\s*\{/.test(this.input.substring(this.pos + 7))) {
				this.advance(7);
				this.skipWhitespace();
				if (this.peek() === '{') this.skipUntilBlockEnd();
				continue;
			}

			if (this.matchKeyword('note') && /^\s*[:{]/.test(this.input.substring(this.pos + 4))) {
				this.advance(4);
				this.skipWhitespace();
				if (this.peek() === '{') this.skipUntilBlockEnd();
				else this.skipLine();
				continue;
			}

			const column = this.parseColumn(name);
			if (column) {
				table.columns.push(column);
			}
		}

		// Expect closing brace
		if (this.peek() !== '}') {
			this.addError('Expected "}" to close table definition');
			return null;
		}
		this.advance(1);

		return table;
	}

	private parseColumn(tableName: string): Column | null {
		this.skipWhitespace();

		// Parse column name
		const name = this.parseIdentifier();
		if (!name) {
			this.addError('Expected column name');
			return null;
		}

		this.skipWhitespace();

		// Parse type
		const type = this.parseType();
		if (!type) {
			this.addError(`Expected type for column "${name}"`);
			return null;
		}

		this.skipSpaces();

		const { constraints, ref } = this.parseConstraints();
		if (ref) {
			this.pendingRefs.push({
				fromTable: tableName,
				fromColumn: name,
				toTable: ref.table,
				toColumn: ref.column,
				type: ref.type,
				line: this.line,
				column: this.column
			});
		}

		this.skipSpaces();
		if (this.peek() === '\n') {
			this.advance(1);
			this.line++;
			this.column = 1;
		} else if (this.peek() !== '}' && this.peek() !== '') {
			this.skipLine();
		}

		return {
			id: this.generateId('col'),
			name,
			type,
			constraints
		};
	}

	private parseType(): string {
		const start = this.pos;

		// Handle primitive types
		while (this.pos < this.input.length &&
			   !this.isWhitespace(this.peek()) &&
			   this.peek() !== '[' &&
			   this.peek() !== '\n' &&
			   this.peek() !== '}') {
			this.advance(1);
		}

		let type = this.input.substring(start, this.pos);

		this.skipSpaces();
		if (this.peek() === '(') {
			this.advance(1);
			const paramStart = this.pos;
			while (this.pos < this.input.length && this.peek() !== ')') {
				this.advance(1);
			}
			const param = this.input.substring(paramStart, this.pos);
			if (this.peek() === ')') {
				this.advance(1);
			}
			type += `(${param})`;
		}

		return type.trim();
	}

	private parseConstraints(): {
		constraints: ColumnConstraints;
		ref: { table: string; column: string; type: RelationType } | null;
	} {
		const constraints: ColumnConstraints = {};
		let ref: { table: string; column: string; type: RelationType } | null = null;

		this.skipSpaces();

		if (this.peek() === '[') {
			this.advance(1);

			while (this.peek() !== ']' && this.pos < this.input.length) {
				this.skipWhitespace();

				if (this.peek() === ',') {
					this.advance(1);
					continue;
				}

				const constraint = this.parseIdentifier();
				if (!constraint) {
					this.skipConstraintValue();
					continue;
				}

				switch (constraint.toLowerCase()) {
					case 'pk':
					case 'primary':
					case 'primarykey':
						constraints.pk = true;
						break;
					case 'not':
						this.skipWhitespace();
						if (this.parseIdentifier()?.toLowerCase() === 'null') {
							constraints.notNull = true;
						}
						break;
					case 'unique':
						constraints.unique = true;
						break;
					case 'increment':
					case 'autoincrement':
						constraints.increment = true;
						break;
					case 'default':
					case 'note':
						this.skipWhitespace();
						if (this.peek() === ':') this.advance(1);
						this.skipConstraintValue();
						break;
					case 'ref':
						constraints.fk = true;
						this.skipWhitespace();
						if (this.peek() === ':') this.advance(1);
						this.skipWhitespace();
						ref = this.parseInlineRef();
						break;
					default:
						this.skipConstraintValue();
						break;
				}

				this.skipWhitespace();
				if (this.peek() === ',') {
					this.advance(1);
				}
			}

			if (this.peek() === ']') {
				this.advance(1);
			}
		}

		return { constraints, ref };
	}

	private parseInlineRef(): { table: string; column: string; type: RelationType } | null {
		const type = this.parseRelationType();
		this.skipWhitespace();
		const target = this.parseTableColumnRef();
		if (!target) {
			this.addError('Expected table.column after ref');
			return null;
		}
		return { table: target.table, column: target.column, type };
	}

	private parseRefStatement() {
		this.advance(3);
		this.skipWhitespace();

		let name: string | undefined;
		if (this.peek() !== ':' && this.peek() !== '{') {
			name = this.parseIdentifier() || undefined;
			this.skipWhitespace();
		}

		if (this.peek() === ':') {
			this.advance(1);
			this.skipWhitespace();
			this.parseRefEndpoints(name);
			this.skipLine();
			return;
		}

		if (this.peek() === '{') {
			this.advance(1);
			while (this.pos < this.input.length && this.peek() !== '}') {
				this.skipWhitespace();
				if (this.peek() === '}' || this.pos >= this.input.length) break;
				if (this.peek() === '\n' || this.peek() === '/' || this.peek() === '#') {
					this.skipLine();
					continue;
				}
				this.parseRefEndpoints(name);
			}
			if (this.peek() === '}') this.advance(1);
			return;
		}

		this.addError('Expected ":" or "{" after Ref');
		this.skipLine();
	}

	private parseRefEndpoints(name?: string) {
		const from = this.parseTableColumnRef();
		this.skipWhitespace();
		const type = this.parseRelationType();
		this.skipWhitespace();
		const to = this.parseTableColumnRef();

		if (!from || !to) {
			this.addError('Expected Ref in the form table.column > table.column');
			this.skipLine();
			return;
		}

		this.pendingRefs.push({
			fromTable: from.table,
			fromColumn: from.column,
			toTable: to.table,
			toColumn: to.column,
			type,
			name,
			line: this.line,
			column: this.column
		});
	}

	private parseRelationType(): RelationType {
		this.skipWhitespace();
		if (this.peek() === '<' && this.peekNext() === '>') {
			this.advance(2);
			return 'many-to-many';
		}
		if (this.peek() === '>') {
			this.advance(1);
			return 'many-to-one';
		}
		if (this.peek() === '<') {
			this.advance(1);
			return 'one-to-many';
		}
		if (this.peek() === '-') {
			this.advance(1);
			return 'one-to-one';
		}
		this.addError('Expected relationship symbol (>, <, -, <>)');
		return 'many-to-one';
	}

	private parseTableColumnRef(): TableColumnRef | null {
		this.skipWhitespace();
		const first = this.parseIdentifier();
		if (!first) return null;

		const parts = [first];
		while (this.peek() === '.') {
			this.advance(1);
			const next = this.parseIdentifier();
			if (!next) break;
			parts.push(next);
		}

		if (parts.length < 2) return null;
		return {
			table: parts[parts.length - 2],
			column: parts[parts.length - 1]
		};
	}

	private resolvePendingRelations(schema: Schema) {
		const tablesByName = new Map<string, Table>();
		for (const table of schema.tables) {
			tablesByName.set(table.name, table);
			if (table.alias) tablesByName.set(table.alias, table);
		}

		const seen = new Set<string>();

		for (const pending of this.pendingRefs) {
			const fromTable = tablesByName.get(pending.fromTable);
			const toTable = tablesByName.get(pending.toTable);
			if (!fromTable || !toTable) {
				this.addWarning(
					`Unknown table in relationship ${pending.fromTable}.${pending.fromColumn} -> ${pending.toTable}.${pending.toColumn}`,
					pending.line,
					pending.column
				);
				continue;
			}

			const fromColumn = fromTable.columns.find((column) => column.name === pending.fromColumn);
			const toColumn = toTable.columns.find((column) => column.name === pending.toColumn);
			if (!fromColumn || !toColumn) {
				this.addWarning(
					`Unknown column in relationship ${pending.fromTable}.${pending.fromColumn} -> ${pending.toTable}.${pending.toColumn}`,
					pending.line,
					pending.column
				);
				continue;
			}

			const key = `${fromTable.id}:${fromColumn.id}->${toTable.id}:${toColumn.id}:${pending.type}`;
			if (seen.has(key)) continue;
			seen.add(key);

			fromColumn.constraints.fk = true;
			schema.relations.push({
				id: this.generateId('rel'),
				name: pending.name,
				from: { tableId: fromTable.id, columnId: fromColumn.id },
				to: { tableId: toTable.id, columnId: toColumn.id },
				type: pending.type
			});
		}
	}

	// ============================================================================
	// Helper Methods
	// ============================================================================

	private parseIdentifier(): string {
		this.skipWhitespace();

		const start = this.pos;

		// Handle quoted identifiers
		if (this.peek() === '"') {
			this.advance(1);
			while (this.pos < this.input.length && this.peek() !== '"') {
				if (this.peek() === '\\') {
					this.advance(1);
				}
				this.advance(1);
			}
			if (this.peek() === '"') {
				this.advance(1);
			}
			return this.input.substring(start + 1, this.pos - 1);
		}

		// Handle backtick quoted identifiers
		if (this.peek() === '`') {
			this.advance(1);
			while (this.pos < this.input.length && this.peek() !== '`') {
				this.advance(1);
			}
			if (this.peek() === '`') {
				this.advance(1);
			}
			return this.input.substring(start + 1, this.pos - 1);
		}

		// Regular identifiers
		while (this.pos < this.input.length) {
			const c = this.peek();
			if (/[a-zA-Z0-9_]/.test(c)) {
				this.advance(1);
			} else {
				break;
			}
		}

		return this.input.substring(start, this.pos);
	}

	private matchKeyword(keyword: string): boolean {
		this.skipWhitespace();
		const remaining = this.input.substring(this.pos);
		const regex = new RegExp(`^${keyword}\\b`, 'i');
		return regex.test(remaining);
	}

	private skipWhitespace() {
		while (this.pos < this.input.length) {
			const c = this.peek();
			if (c === ' ' || c === '\t' || c === '\r') {
				this.advance(1);
			} else if (c === '\n') {
				this.line++;
				this.column = 1;
				this.advance(1);
			} else if (c === '/' && this.peekNext() === '/') {
				// Single line comment
				this.skipLine();
			} else if (c === '/' && this.peekNext() === '*') {
				// Multi-line comment
				this.advance(2);
				while (this.pos < this.input.length - 1) {
					if (this.peek() === '*' && this.peekNext() === '/') {
						this.advance(2);
						break;
					}
					if (this.peek() === '\n') {
						this.line++;
						this.column = 1;
					}
					this.advance(1);
				}
			} else if (c === '#') {
				// Hash comment
				this.skipLine();
			} else {
				break;
			}
		}
	}

	private skipSpaces() {
		while (this.pos < this.input.length) {
			const c = this.peek();
			if (c === ' ' || c === '\t' || c === '\r') {
				this.advance(1);
			} else {
				break;
			}
		}
	}

	private skipLine() {
		while (this.pos < this.input.length && this.peek() !== '\n') {
			this.advance(1);
		}
		if (this.peek() === '\n') {
			this.advance(1);
			this.line++;
			this.column = 1;
		}
	}

	private skipUntilBlockEnd() {
		let depth = 1;
		this.advance(1); // Skip first {

		while (this.pos < this.input.length && depth > 0) {
			if (this.peek() === '{') {
				depth++;
			} else if (this.peek() === '}') {
				depth--;
			}
			this.advance(1);
		}
	}

	private skipUntilOpeningBrace() {
		while (this.pos < this.input.length && this.peek() !== '{' && this.peek() !== '\n') {
			this.advance(1);
		}
	}

	private skipConstraintValue() {
		this.skipWhitespace();
		if (this.peek() === ':') {
			this.advance(1);
			this.skipWhitespace();
		}

		const quote = this.peek();
		if (quote === "'" || quote === '"') {
			this.advance(1);
			while (this.pos < this.input.length && this.peek() !== quote) {
				if (this.peek() === '\\') this.advance(1);
				this.advance(1);
			}
			if (this.peek() === quote) this.advance(1);
			return;
		}

		while (this.pos < this.input.length) {
			const c = this.peek();
			if (c === ',' || c === ']' || c === '\n') break;
			this.advance(1);
		}
	}

	private peek(): string {
		return this.pos < this.input.length ? this.input[this.pos] : '';
	}

	private peekNext(): string {
		return this.pos + 1 < this.input.length ? this.input[this.pos + 1] : '';
	}

	private advance(n: number) {
		for (let i = 0; i < n; i++) {
			if (this.pos < this.input.length) {
				this.column++;
				this.pos++;
			}
		}
	}

	private isWhitespace(c: string): boolean {
		return c === ' ' || c === '\t' || c === '\n' || c === '\r';
	}

	private addError(message: string) {
		this.errors.push({
			line: this.line,
			column: this.column,
			message,
			type: 'error'
		});
	}

	private addWarning(message: string, line = this.line, column = this.column) {
		this.errors.push({
			line,
			column,
			message,
			type: 'warning'
		});
	}

	private generateId(prefix: string): string {
		return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
	}
}

// ============================================================================
// Convenience function
// ============================================================================

export function parseDBML(input: string): ParseResult {
	const parser = new DBMLParser();
	return parser.parse(input);
}
