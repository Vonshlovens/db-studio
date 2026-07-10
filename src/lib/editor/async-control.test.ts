import { describe, expect, it } from 'vitest';
import { GenerationGuard, SaveCoordinator, type SaveAttemptResult } from './async-control';

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((next) => {
		resolve = next;
	});
	return { promise, resolve };
}

describe('GenerationGuard', () => {
	it('invalidates work from earlier generations', () => {
		const guard = new GenerationGuard();
		const first = guard.begin();
		const second = guard.begin();

		expect(guard.isCurrent(first)).toBe(false);
		expect(guard.isCurrent(second)).toBe(true);
	});
});

describe('SaveCoordinator', () => {
	it('serializes a follow-up save requested during an in-flight save', async () => {
		const attempts: Array<ReturnType<typeof deferred<SaveAttemptResult>>> = [];
		const coordinator = new SaveCoordinator(() => {
			const attempt = deferred<SaveAttemptResult>();
			attempts.push(attempt);
			return attempt.promise;
		});

		const firstRequest = coordinator.request();
		const leaveRequest = coordinator.request(true);
		expect(attempts).toHaveLength(1);

		attempts[0].resolve('dirty');
		await Promise.resolve();
		expect(attempts).toHaveLength(2);

		attempts[1].resolve('saved');
		await expect(firstRequest).resolves.toBe(true);
		await expect(leaveRequest).resolves.toBe(true);
		expect(coordinator.isSaving).toBe(false);
	});

	it('keeps saving until the current fingerprint is confirmed when leaving', async () => {
		const results: SaveAttemptResult[] = ['dirty', 'dirty', 'saved'];
		let attempts = 0;
		const coordinator = new SaveCoordinator(async () => {
			attempts += 1;
			return results.shift() ?? 'saved';
		});

		await expect(coordinator.request(true)).resolves.toBe(true);
		expect(attempts).toBe(3);
	});

	it('stops on an error instead of retrying indefinitely', async () => {
		let attempts = 0;
		const coordinator = new SaveCoordinator(async () => {
			attempts += 1;
			return 'failed';
		});

		await expect(coordinator.request(true)).resolves.toBe(false);
		expect(attempts).toBe(1);
	});
});
