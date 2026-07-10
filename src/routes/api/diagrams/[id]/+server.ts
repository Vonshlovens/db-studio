import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDiagramRepository } from '$lib/server/db/client';
import { errorBody, readJsonBody, toDiagramDto } from '$lib/server/diagrams/http';
import {
	DiagramValidationError,
	parseUpdateDiagramInput,
	type UpdateDiagramInput
} from '$lib/server/diagrams/serialization';

export const GET: RequestHandler = async ({ params, locals }) => {
	const diagram = await getDiagramRepository().findById(locals.ownerId, params.id);
	if (!diagram) {
		return json(errorBody('not_found', 'Diagram not found'), { status: 404 });
	}
	return json({ diagram: toDiagramDto(diagram) });
};

async function update(
	request: Request,
	ownerId: string,
	id: string,
	requireAll: boolean
): Promise<Response> {
	let input: UpdateDiagramInput;
	try {
		input = parseUpdateDiagramInput(await readJsonBody(request), requireAll);
	} catch (error) {
		if (error instanceof DiagramValidationError) {
			return json(errorBody('invalid_request', error.message), { status: 400 });
		}
		throw error;
	}

	const diagram = await getDiagramRepository().update(ownerId, id, input);
	if (!diagram) {
		return json(errorBody('not_found', 'Diagram not found'), { status: 404 });
	}
	return json({ diagram: toDiagramDto(diagram) });
}

export const PUT: RequestHandler = ({ request, params, locals }) =>
	update(request, locals.ownerId, params.id, true);

export const PATCH: RequestHandler = ({ request, params, locals }) =>
	update(request, locals.ownerId, params.id, false);

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const deleted = await getDiagramRepository().delete(locals.ownerId, params.id);
	if (!deleted) {
		return json(errorBody('not_found', 'Diagram not found'), { status: 404 });
	}
	return new Response(null, { status: 204 });
};
