import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT_STATE, DEFAULT_SCHEMA } from '$lib/types';
import { sampleSchema } from '$lib/data/sample';
import {
	DiagramDataError,
	DiagramValidationError,
	deserializeLayout,
	deserializeSchema,
	parseCreateDiagramInput,
	parseUpdateDiagramInput,
	serializeLayout,
	serializeSchema
} from './serialization';

describe('diagram serialization', () => {
	it('round-trips the current Schema and LayoutState shapes', () => {
		const schema = structuredClone(sampleSchema);
		const layout = structuredClone(DEFAULT_LAYOUT_STATE);

		expect(deserializeSchema(serializeSchema(schema))).toEqual(schema);
		expect(deserializeLayout(serializeLayout(layout))).toEqual(layout);
	});

	it('normalizes names and validates create input', () => {
		const input = parseCreateDiagramInput({
			name: '  Customer model  ',
			schema: structuredClone(DEFAULT_SCHEMA),
			layout: structuredClone(DEFAULT_LAYOUT_STATE)
		});

		expect(input.name).toBe('Customer model');
	});

	it('rejects invalid nested values with a useful path', () => {
		const layout = structuredClone(DEFAULT_LAYOUT_STATE) as unknown as Record<string, unknown>;
		layout.viewport = { x: 0, y: 0, zoom: Number.NaN };

		expect(() =>
			parseCreateDiagramInput({
				name: 'Invalid',
				schema: structuredClone(DEFAULT_SCHEMA),
				layout
			})
		).toThrowError(/layout\.viewport\.zoom/);
	});

	it('requires complete PUT input and non-empty PATCH input', () => {
		expect(() => parseUpdateDiagramInput({ name: 'Only a patch' }, true)).toThrow(
			DiagramValidationError
		);
		expect(() => parseUpdateDiagramInput({})).toThrow(DiagramValidationError);
	});

	it('distinguishes corrupt stored data from request validation errors', () => {
		expect(() => deserializeSchema('{not json')).toThrow(DiagramDataError);
		expect(() => deserializeLayout('{"viewport":{}}')).toThrow(DiagramDataError);
	});
});
