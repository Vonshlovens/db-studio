/**
 * Shared table-card layout used by SVG rendering and relationship routing.
 * Keep these numbers in sync with TableCard.svelte.
 */

export const TABLE_WIDTH = 220;
export const TABLE_HEADER_HEIGHT = 36;
export const TABLE_COLUMN_START_Y = 44;
export const TABLE_COLUMN_HEIGHT = 28;

export function getTableHeight(columnCount: number): number {
	return (columnCount + 1) * TABLE_COLUMN_HEIGHT + 16;
}

export function getColumnCenterY(columnIndex: number): number {
	const index = Math.max(0, columnIndex);
	return TABLE_COLUMN_START_Y + index * TABLE_COLUMN_HEIGHT + TABLE_COLUMN_HEIGHT / 2;
}
