import type { Position, Table, ViewportState } from '$lib/types';
import { getTableHeight, TABLE_WIDTH } from './table-geometry';

export interface Bounds extends Position {
	width: number;
	height: number;
}

export function viewportBounds(viewport: ViewportState, width: number, height: number): Bounds {
	return {
		x: -viewport.x / viewport.zoom,
		y: -viewport.y / viewport.zoom,
		width: width / viewport.zoom,
		height: height / viewport.zoom
	};
}

export function tableBounds(table: Table): Bounds {
	return { ...table.position, width: TABLE_WIDTH, height: getTableHeight(table.columns.length) };
}

/** Fit the union of cards and visible world into an aspect-preserving, padded overview. */
export function minimapTransform(bounds: Bounds[], width: number, height: number, padding = 8) {
	const left = Math.min(...bounds.map((b) => b.x));
	const top = Math.min(...bounds.map((b) => b.y));
	const right = Math.max(...bounds.map((b) => b.x + b.width));
	const bottom = Math.max(...bounds.map((b) => b.y + b.height));
	const scale = Math.min(
		(width - padding * 2) / Math.max(1, right - left),
		(height - padding * 2) / Math.max(1, bottom - top)
	);
	return {
		scale,
		x: (width - (right - left) * scale) / 2 - left * scale,
		y: (height - (bottom - top) * scale) / 2 - top * scale
	};
}

export function minimapToWorld(point: Position, transform: ReturnType<typeof minimapTransform>): Position {
	return { x: (point.x - transform.x) / transform.scale, y: (point.y - transform.y) / transform.scale };
}

export function panToCenter(point: Position, viewport: ViewportState, width: number, height: number): Position {
	return {
		x: width / 2 - point.x * viewport.zoom - viewport.x,
		y: height / 2 - point.y * viewport.zoom - viewport.y
	};
}
