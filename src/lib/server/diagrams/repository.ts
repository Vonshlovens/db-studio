import { and, desc, eq } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type { LayoutState, Schema } from '$lib/types';
import { databaseSchema, diagrams, type DiagramRow } from '$lib/server/db/schema';
import {
	deserializeLayout,
	deserializeSchema,
	normalizeDiagramName,
	serializeLayout,
	serializeSchema,
	type CreateDiagramInput,
	type UpdateDiagramInput
} from './serialization';

export interface Diagram {
	id: string;
	name: string;
	schema: Schema;
	layout: LayoutState;
	createdAt: Date;
	updatedAt: Date;
}

export interface DiagramSummary {
	id: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}

interface RepositoryDependencies {
	createId: () => string;
	now: () => Date;
}

const defaultDependencies: RepositoryDependencies = {
	createId: () => crypto.randomUUID(),
	now: () => new Date()
};

export class DiagramRepository {
	readonly #db: LibSQLDatabase<typeof databaseSchema>;
	readonly #dependencies: RepositoryDependencies;

	constructor(
		db: LibSQLDatabase<typeof databaseSchema>,
		dependencies: Partial<RepositoryDependencies> = {}
	) {
		this.#db = db;
		this.#dependencies = { ...defaultDependencies, ...dependencies };
	}

	async list(ownerId: string): Promise<DiagramSummary[]> {
		const rows = await this.#db
			.select({
				id: diagrams.id,
				name: diagrams.name,
				createdAt: diagrams.createdAt,
				updatedAt: diagrams.updatedAt
			})
			.from(diagrams)
			.where(eq(diagrams.ownerId, ownerId))
			.orderBy(desc(diagrams.updatedAt), desc(diagrams.createdAt));

		return rows;
	}

	async findById(ownerId: string, id: string): Promise<Diagram | null> {
		const [row] = await this.#db
			.select()
			.from(diagrams)
			.where(and(eq(diagrams.id, id), eq(diagrams.ownerId, ownerId)))
			.limit(1);

		return row ? this.#toDiagram(row) : null;
	}

	async create(ownerId: string, input: CreateDiagramInput): Promise<Diagram> {
		const timestamp = this.#dependencies.now();
		const row: DiagramRow = {
			id: this.#dependencies.createId(),
			ownerId,
			name: normalizeDiagramName(input.name),
			schemaJson: serializeSchema(input.schema),
			layoutJson: serializeLayout(input.layout),
			createdAt: timestamp,
			updatedAt: timestamp
		};

		await this.#db.insert(diagrams).values(row);
		return this.#toDiagram(row);
	}

	async update(ownerId: string, id: string, input: UpdateDiagramInput): Promise<Diagram | null> {
		const changes: Partial<DiagramRow> = {
			updatedAt: this.#dependencies.now()
		};

		if (input.name !== undefined) changes.name = normalizeDiagramName(input.name);
		if (input.schema !== undefined) changes.schemaJson = serializeSchema(input.schema);
		if (input.layout !== undefined) changes.layoutJson = serializeLayout(input.layout);

		const [row] = await this.#db
			.update(diagrams)
			.set(changes)
			.where(and(eq(diagrams.id, id), eq(diagrams.ownerId, ownerId)))
			.returning();

		return row ? this.#toDiagram(row) : null;
	}

	async delete(ownerId: string, id: string): Promise<boolean> {
		const rows = await this.#db
			.delete(diagrams)
			.where(and(eq(diagrams.id, id), eq(diagrams.ownerId, ownerId)))
			.returning({ id: diagrams.id });

		return rows.length > 0;
	}

	#toDiagram(row: DiagramRow): Diagram {
		return {
			id: row.id,
			name: row.name,
			schema: deserializeSchema(row.schemaJson),
			layout: deserializeLayout(row.layoutJson),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt
		};
	}
}
