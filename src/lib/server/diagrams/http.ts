import type { Diagram, DiagramSummary } from './repository';
import { DiagramValidationError } from './serialization';

export async function readJsonBody(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch (error) {
		throw new DiagramValidationError('body must contain valid JSON', { cause: error });
	}
}

export function toDiagramDto(diagram: Diagram) {
	return {
		...diagram,
		createdAt: diagram.createdAt.toISOString(),
		updatedAt: diagram.updatedAt.toISOString()
	};
}

export function toDiagramSummaryDto(diagram: DiagramSummary) {
	return {
		...diagram,
		createdAt: diagram.createdAt.toISOString(),
		updatedAt: diagram.updatedAt.toISOString()
	};
}

export function errorBody(code: string, message: string) {
	return { error: { code, message } };
}
