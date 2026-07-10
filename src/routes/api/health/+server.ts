import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabaseClient } from '$lib/server/db/client';
import { errorBody } from '$lib/server/diagrams/http';

export const GET: RequestHandler = async () => {
	try {
		await getDatabaseClient().execute('SELECT 1');
		return json({ status: 'ok' });
	} catch (error) {
		console.error('Database health check failed', error);
		return json(errorBody('database_unavailable', 'Database unavailable'), { status: 503 });
	}
};
