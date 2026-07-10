import type { Position } from '$lib/types';

export function clientToLocal(
	clientX: number,
	clientY: number,
	bounds: Pick<DOMRect, 'left' | 'top'>
): Position {
	return {
		x: clientX - bounds.left,
		y: clientY - bounds.top
	};
}

export function snapPositionToGrid(position: Position, gridSize: number): Position {
	if (!Number.isFinite(gridSize) || gridSize <= 0) return position;

	return {
		x: Math.round(position.x / gridSize) * gridSize,
		y: Math.round(position.y / gridSize) * gridSize
	};
}
