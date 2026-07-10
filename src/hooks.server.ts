import type { Handle } from '@sveltejs/kit';

const OWNER_COOKIE = 'db-studio-owner';
const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const handle: Handle = async ({ event, resolve }) => {
	const cookieOwnerId = event.cookies.get(OWNER_COOKIE);
	const ownerId =
		cookieOwnerId && UUID_PATTERN.test(cookieOwnerId) ? cookieOwnerId : crypto.randomUUID();

	event.locals.ownerId = ownerId;

	if (ownerId !== cookieOwnerId) {
		event.cookies.set(OWNER_COOKIE, ownerId, {
			httpOnly: true,
			sameSite: 'lax',
			secure: event.url.protocol === 'https:',
			path: '/',
			maxAge: OWNER_COOKIE_MAX_AGE
		});
	}

	return resolve(event);
};
