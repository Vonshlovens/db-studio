import { describe, expect, it } from 'vitest';
import { minimapToWorld, minimapTransform, panToCenter, tableBounds, viewportBounds } from './minimap-geometry';
import { TABLE_WIDTH, getTableHeight } from './table-geometry';
import type { Table } from '$lib/types';

describe('minimap geometry', () => {
	it('converts translated, zoomed canvas dimensions to visible world bounds', () => {
		expect(viewportBounds({ x: 100, y: -200, zoom: 2 }, 800, 600))
			.toEqual({ x: -50, y: 100, width: 400, height: 300 });
	});

	it('uses shared card dimensions, including negative positions and column count', () => {
		const table = { position: { x: -400, y: -200 }, columns: [{}, {}, {}] } as Table;
		expect(tableBounds(table)).toEqual({
			x: -400, y: -200, width: TABLE_WIDTH, height: getTableHeight(3)
		});
	});

	it('fits distant tables and viewport within padding without stretching', () => {
		const bounds = [
			{ x: -1200, y: -500, width: 220, height: 100 },
			{ x: 3000, y: 800, width: 800, height: 600 }
		];
		const transform = minimapTransform(bounds, 180, 120);
		for (const b of bounds) {
			expect(b.x * transform.scale + transform.x).toBeGreaterThanOrEqual(8 - 1e-9);
			expect(b.y * transform.scale + transform.y).toBeGreaterThanOrEqual(8 - 1e-9);
			expect((b.x + b.width) * transform.scale + transform.x).toBeLessThanOrEqual(172 + 1e-9);
			expect((b.y + b.height) * transform.scale + transform.y).toBeLessThanOrEqual(112 + 1e-9);
		}
		const point = { x: -350, y: 240 };
		const roundTrip = minimapToWorld({
			x: point.x * transform.scale + transform.x,
			y: point.y * transform.scale + transform.y
		}, transform);
		expect(roundTrip.x).toBeCloseTo(point.x);
		expect(roundTrip.y).toBeCloseTo(point.y);
	});

	it('centers a clicked world point at different zooms without changing zoom', () => {
		for (const zoom of [0.1, 1, 3]) {
			const viewport = { x: 200, y: -500, zoom };
			const point = { x: -900, y: 450 };
			const delta = panToCenter(point, viewport, 800, 600);
			expect(point.x * zoom + viewport.x + delta.x).toBeCloseTo(400);
			expect(point.y * zoom + viewport.y + delta.y).toBeCloseTo(300);
		}
	});

	it('handles an empty schema using only the viewport, even before sizing', () => {
		const transform = minimapTransform([viewportBounds({ x: 0, y: 0, zoom: 1 }, 0, 0)], 180, 120);
		expect(Number.isFinite(transform.scale)).toBe(true);
		expect(minimapToWorld({ x: 90, y: 60 }, transform)).toEqual({ x: 0, y: 0 });
	});
});
