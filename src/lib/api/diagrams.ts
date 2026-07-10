import type { LayoutState, Schema } from '$lib/types';

export interface DiagramSummary {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface Diagram extends DiagramSummary {
	schema: Schema;
	layout: LayoutState;
}

export interface DiagramPayload {
	name: string;
	schema: Schema;
	layout: LayoutState;
}

export type DiagramUpdate = Partial<DiagramPayload>;

export class DiagramApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string
	) {
		super(message);
		this.name = 'DiagramApiError';
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
	if (typeof value !== 'string') {
		throw new DiagramApiError(`The server returned an invalid ${field}.`, 500);
	}
	return value;
}

function parseSummary(value: unknown): DiagramSummary {
	if (!isRecord(value)) {
		throw new DiagramApiError('The server returned an invalid diagram.', 500);
	}

	return {
		id: requireString(value.id, 'diagram id'),
		name: requireString(value.name, 'diagram name'),
		createdAt: requireString(value.createdAt, 'creation date'),
		updatedAt: requireString(value.updatedAt, 'update date')
	};
}

function parseDiagram(value: unknown): Diagram {
	if (!isRecord(value) || !isRecord(value.schema) || !isRecord(value.layout)) {
		throw new DiagramApiError('The server returned invalid diagram data.', 500);
	}

	return {
		...parseSummary(value),
		schema: value.schema as unknown as Schema,
		layout: value.layout as unknown as LayoutState
	};
}

async function apiRequest(path: string, init?: RequestInit): Promise<unknown> {
	const response = await fetch(path, {
		...init,
		headers: init?.body
			? { 'content-type': 'application/json', ...init.headers }
			: init?.headers
	});

	if (response.ok) {
		return response.status === 204 ? undefined : response.json();
	}

	let message = 'Something went wrong. Please try again.';
	let code: string | undefined;
	try {
		const body: unknown = await response.json();
		if (isRecord(body) && isRecord(body.error)) {
			if (typeof body.error.message === 'string') message = body.error.message;
			if (typeof body.error.code === 'string') code = body.error.code;
		}
	} catch {
		// Keep the generic message when the server did not return JSON.
	}

	throw new DiagramApiError(message, response.status, code);
}

export async function listDiagrams(): Promise<DiagramSummary[]> {
	const body = await apiRequest('/api/diagrams');
	if (!isRecord(body) || !Array.isArray(body.diagrams)) {
		throw new DiagramApiError('The server returned an invalid diagram list.', 500);
	}
	return body.diagrams.map(parseSummary);
}

export async function createDiagram(payload: DiagramPayload): Promise<Diagram> {
	const body = await apiRequest('/api/diagrams', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
	if (!isRecord(body)) {
		throw new DiagramApiError('The server returned an invalid diagram.', 500);
	}
	return parseDiagram(body.diagram);
}

export async function getDiagram(id: string): Promise<Diagram> {
	const body = await apiRequest(`/api/diagrams/${encodeURIComponent(id)}`);
	if (!isRecord(body)) {
		throw new DiagramApiError('The server returned an invalid diagram.', 500);
	}
	return parseDiagram(body.diagram);
}

export async function updateDiagram(id: string, update: DiagramUpdate): Promise<Diagram> {
	const body = await apiRequest(`/api/diagrams/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		body: JSON.stringify(update)
	});
	if (!isRecord(body)) {
		throw new DiagramApiError('The server returned an invalid diagram.', 500);
	}
	return parseDiagram(body.diagram);
}

export async function deleteDiagram(id: string): Promise<void> {
	await apiRequest(`/api/diagrams/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
