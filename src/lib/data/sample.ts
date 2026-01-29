/**
 * Sample data for DB Studio testing
 */

import type { Schema, Table, Relation } from '$lib/types';

export const sampleDBML = `Table users {
  id int [pk, increment]
  email varchar [unique, not null]
  username varchar [unique, not null]
  full_name varchar
  created_at timestamp [default: 'now()']
  updated_at timestamp
}

Table posts {
  id int [pk, increment]
  user_id int [ref: > users.id]
  title varchar [not null]
  content text
  published boolean [default: false]
  created_at timestamp
  updated_at timestamp
}

Table comments {
  id int [pk, increment]
  post_id int [ref: > posts.id]
  user_id int [ref: > users.id]
  content text [not null]
  created_at timestamp
}

Table categories {
  id int [pk, increment]
  name varchar [unique, not null]
  description varchar
}

Table post_categories {
  post_id int [ref: > posts.id]
  category_id int [ref: > categories.id]

  indexes {
    (post_id, category_id) [pk]
  }
}`;

export const sampleSchema: Schema = {
	tables: [
		{
			id: 'table_users',
			name: 'users',
			columns: [
				{ id: 'col_1', name: 'id', type: 'int', constraints: { pk: true, increment: true } },
				{ id: 'col_2', name: 'email', type: 'varchar', constraints: { unique: true, notNull: true } },
				{ id: 'col_3', name: 'username', type: 'varchar', constraints: { unique: true, notNull: true } },
				{ id: 'col_4', name: 'full_name', type: 'varchar', constraints: {} },
				{ id: 'col_5', name: 'created_at', type: 'timestamp', constraints: {}, defaultValue: 'now()' },
				{ id: 'col_6', name: 'updated_at', type: 'timestamp', constraints: {} }
			],
			indexes: [],
			position: { x: 50, y: 50 }
		},
		{
			id: 'table_posts',
			name: 'posts',
			columns: [
				{ id: 'col_7', name: 'id', type: 'int', constraints: { pk: true, increment: true } },
				{ id: 'col_8', name: 'user_id', type: 'int', constraints: {} },
				{ id: 'col_9', name: 'title', type: 'varchar', constraints: { notNull: true } },
				{ id: 'col_10', name: 'content', type: 'text', constraints: {} },
				{ id: 'col_11', name: 'published', type: 'boolean', constraints: {}, defaultValue: 'false' },
				{ id: 'col_12', name: 'created_at', type: 'timestamp', constraints: {} },
				{ id: 'col_13', name: 'updated_at', type: 'timestamp', constraints: {} }
			],
			indexes: [],
			position: { x: 400, y: 50 }
		},
		{
			id: 'table_comments',
			name: 'comments',
			columns: [
				{ id: 'col_14', name: 'id', type: 'int', constraints: { pk: true, increment: true } },
				{ id: 'col_15', name: 'post_id', type: 'int', constraints: {} },
				{ id: 'col_16', name: 'user_id', type: 'int', constraints: {} },
				{ id: 'col_17', name: 'content', type: 'text', constraints: { notNull: true } },
				{ id: 'col_18', name: 'created_at', type: 'timestamp', constraints: {} }
			],
			indexes: [],
			position: { x: 400, y: 350 }
		},
		{
			id: 'table_categories',
			name: 'categories',
			columns: [
				{ id: 'col_19', name: 'id', type: 'int', constraints: { pk: true, increment: true } },
				{ id: 'col_20', name: 'name', type: 'varchar', constraints: { unique: true, notNull: true } },
				{ id: 'col_21', name: 'description', type: 'varchar', constraints: {} }
			],
			indexes: [],
			position: { x: 50, y: 350 }
		}
	],
	relations: [
		{
			id: 'rel_1',
			from: { tableId: 'table_posts', columnId: 'col_8' },
			to: { tableId: 'table_users', columnId: 'col_1' },
			type: 'many-to-one'
		},
		{
			id: 'rel_2',
			from: { tableId: 'table_comments', columnId: 'col_15' },
			to: { tableId: 'table_posts', columnId: 'col_7' },
			type: 'many-to-one'
		},
		{
			id: 'rel_3',
			from: { tableId: 'table_comments', columnId: 'col_16' },
			to: { tableId: 'table_users', columnId: 'col_1' },
			type: 'many-to-one'
		}
	],
	tableGroups: [],
	enums: []
};
