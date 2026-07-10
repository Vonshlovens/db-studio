import { afterEach, describe, expect, it, vi } from 'vitest';
import { sampleSchema } from '$lib/data/sample';
import { DEFAULT_LAYOUT_STATE } from '$lib/types';
import { getDiagram, listDiagrams } from './diagrams';

const timestamp = '2026-07-10T08:00:00.000Z';

function respondWith(body: unknown): void {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(
			new Response(JSON.stringify(body), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		)
	);
}

function validDiagram() {
	const layout = structuredClone(DEFAULT_LAYOUT_STATE);
	layout.tablePositions.table_users = { x: 50, y: 50 };
	return {
		id: 'diagram-1',
		name: 'Customer model',
		createdAt: timestamp,
		updatedAt: timestamp,
		schema: structuredClone(sampleSchema),
		layout
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('diagram API response validation', () => {
	it('accepts valid representative diagram data', async () => {
		const diagram = validDiagram();
		respondWith({ diagram });

		await expect(getDiagram(diagram.id)).resolves.toEqual(diagram);
	});

	it('rejects malformed ISO dates in diagram summaries', async () => {
		respondWith({
			diagrams: [
				{
					id: 'diagram-1',
					name: 'Invalid date',
					createdAt: '2026-02-30T08:00:00.000Z',
					updatedAt: timestamp
				}
			]
		});

		await expect(listDiagrams()).rejects.toMatchObject({
			name: 'DiagramApiError',
			status: 500,
			message: 'The server returned an invalid creation date.'
		});
	});

	it('rejects malformed nested schema data', async () => {
		const diagram = validDiagram();
		diagram.schema.relations[0].from.columnId = 'missing-column';
		respondWith({ diagram });

		await expect(getDiagram(diagram.id)).rejects.toMatchObject({
			name: 'DiagramApiError',
			status: 500,
			message: 'The server returned an invalid diagram schema.relations[0].from.columnId.'
		});
	});

	it.each([
		['out-of-range zoom', (diagram: ReturnType<typeof validDiagram>) => {
			diagram.layout.viewport.zoom = 4;
		}, 'The server returned an invalid diagram layout.viewport.zoom.'],
		['non-positive grid size', (diagram: ReturnType<typeof validDiagram>) => {
			diagram.layout.gridSize = 0;
		}, 'The server returned an invalid diagram layout.gridSize.'],
		['orphaned table position', (diagram: ReturnType<typeof validDiagram>) => {
			diagram.layout.tablePositions['missing-table'] = { x: 0, y: 0 };
		}, 'The server returned an invalid diagram layout.tablePositions.missing-table.']
	])('rejects malformed layout data: %s', async (_label, mutate, message) => {
		const diagram = validDiagram();
		mutate(diagram);
		respondWith({ diagram });

		await expect(getDiagram(diagram.id)).rejects.toMatchObject({
			name: 'DiagramApiError',
			status: 500,
			message
		});
	});
});
