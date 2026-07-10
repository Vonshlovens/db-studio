import { describe, expect, it } from 'vitest';
import { clientToLocal, snapPositionToGrid } from './canvas-geometry';

describe('canvas geometry', () => {
	it('converts client coordinates to SVG-local coordinates', () => {
		expect(clientToLocal(450, 275, { left: 120, top: 75 })).toEqual({ x: 330, y: 200 });
	});

	it('snaps positions to the configured grid size', () => {
		expect(snapPositionToGrid({ x: 46, y: -13 }, 20)).toEqual({ x: 40, y: -20 });
	});

	it('leaves positions unchanged for an invalid grid size', () => {
		const position = { x: 46, y: 13 };
		expect(snapPositionToGrid(position, 0)).toBe(position);
	});
});
