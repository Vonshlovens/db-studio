import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const diagrams = sqliteTable(
	'diagrams',
	{
		id: text('id').primaryKey(),
		ownerId: text('owner_id').notNull(),
		name: text('name').notNull(),
		schemaJson: text('schema_json').notNull(),
		layoutJson: text('layout_json').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
	},
	(table) => [index('diagrams_owner_updated_idx').on(table.ownerId, table.updatedAt)]
);

export const databaseSchema = { diagrams };

export type DiagramRow = typeof diagrams.$inferSelect;
export type NewDiagramRow = typeof diagrams.$inferInsert;
