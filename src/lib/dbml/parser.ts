/**
 * DBML Parser
 * Converts DBML text to internal Schema representation
 * This is a skeleton implementation that handles basic cases
 */

import type { Schema, Table, Column, Relation, ParseResult, ParseError, RelationType } from '$lib/types';

// ============================================================================
// Types for Parser
// ============================================================================

interface Token {
	type: string;
	value: string;
	line: number;
	column: number;
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

	// ============================================================================
	// Public API
	// ============================================================================

	parse(input: string): ParseResult {
		this.input = input;
		this.errors = [];
		this.line = 1;
		this.column = 1;
		this.pos = 0;

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
					// Extract relations from column refs
					this.extractRelations(table, schema);
				}
			} else if (this.matchKeyword('TableGroup')) {
				// Skip for now - groups will be implemented later
				this.skipUntilBlockEnd();
			} else if (this.matchKeyword('Enum')) {
				// Skip for now - enums will be implemented later
				this.skipUntilBlockEnd();
			} else if (this.matchKeyword('Project')) {
				// Skip project metadata
				this.skipUntilBlockEnd();
			} else {
				// Unknown content, skip line
				this.skipLine();
			}
		}

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

			const column = this.parseColumn();
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

	private parseColumn(): Column | null {
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

		this.skipWhitespace();

		// Parse constraints
		const constraints = this.parseConstraints();

		// Skip to end of line
		this.skipLine();

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

		// Handle array types like varchar(255)
		this.skipWhitespace();
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

	private parseConstraints(): { pk?: boolean; notNull?: boolean; unique?: boolean; fk?: boolean } {
		const constraints: { pk?: boolean; notNull?: boolean; unique?: boolean; fk?: boolean } = {};

		this.skipWhitespace();

		if (this.peek() === '[') {
			this.advance(1);

			while (this.peek() !== ']' && this.pos < this.input.length) {
				this.skipWhitespace();

				const constraint = this.parseIdentifier();
				if (!constraint) break;

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
					case 'ref':
						// Foreign key reference - store it for relation extraction
						constraints.fk = true;
						this.skipUntil(']');
						break;
					case 'increment':
					case 'autoincrement':
						// Auto-increment flag
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

		return constraints;
	}

	private extractRelations(table: Table, schema: Schema) {
		// This will be implemented to parse ref: constraints
		// For now, relations are parsed separately
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

	private skipUntil(char: string) {
		while (this.pos < this.input.length && this.peek() !== char) {
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
