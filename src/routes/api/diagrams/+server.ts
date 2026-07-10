import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDiagramRepository } from '$lib/server/db/client';
import {
	errorBody,
	readJsonBody,
	toDiagramDto,
	toDiagramSummaryDto
} from '$lib/server/diagrams/http';
import {
	DiagramValidationError,
	parseCreateDiagramInput
} from '$lib/server/diagrams/serialization';

export const GET: RequestHandler = async ({ locals }) => {
	const diagrams = await getDiagramRepository().list(locals.ownerId);
	return json({ diagrams: diagrams.map(toDiagramSummaryDto) });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const input = parseCreateDiagramInput(await readJsonBody(request));
		const diagram = await getDiagramRepository().create(locals.ownerId, input);
		return json({ diagram: toDiagramDto(diagram) }, { status: 201 });
	} catch (error) {
		if (error instanceof DiagramValidationError) {
			return json(errorBody('invalid_request', error.message), { status: 400 });
		}
		throw error;
	}
};
