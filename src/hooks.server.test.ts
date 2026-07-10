import { describe, expect, it, vi } from 'vitest';
import { handle } from './hooks.server';

describe('ownership cookie', () => {
	it.each([
		['http:', false],
		['https:', true]
	])('derives cookie security from the %s request URL', async (protocol, secure) => {
		const setCookie = vi.fn();
		const event = {
			url: new URL(`${protocol}//db-studio.example/`),
			cookies: {
				get: vi.fn(),
				set: setCookie
			},
			locals: {}
		};

		await handle({
			event,
			resolve: async () => new Response()
		} as never);

		expect(setCookie).toHaveBeenCalledWith(
			'db-studio-owner',
			expect.any(String),
			expect.objectContaining({ secure })
		);
	});
});
