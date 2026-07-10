export type SaveAttemptResult = 'saved' | 'dirty' | 'failed' | 'stale';

export class GenerationGuard {
	#current = 0;

	begin(): number {
		this.#current += 1;
		return this.#current;
	}

	isCurrent(generation: number): boolean {
		return generation === this.#current;
	}
}

export class SaveCoordinator {
	#active: Promise<boolean> | null = null;
	#queued = false;
	#ensureCurrent = false;

	constructor(private readonly attemptSave: () => Promise<SaveAttemptResult>) {}

	get isSaving(): boolean {
		return this.#active !== null;
	}

	request(ensureCurrent = false): Promise<boolean> {
		this.#queued = true;
		this.#ensureCurrent ||= ensureCurrent;

		if (!this.#active) {
			const run = this.#drain().finally(() => {
				if (this.#active === run) {
					this.#active = null;
					this.#queued = false;
					this.#ensureCurrent = false;
				}
			});
			this.#active = run;
		}

		return this.#active;
	}

	async #drain(): Promise<boolean> {
		while (this.#queued) {
			this.#queued = false;
			const result = await this.attemptSave();

			if (result === 'failed' || result === 'stale') return false;
			if (result === 'dirty' && this.#ensureCurrent) this.#queued = true;
		}

		return true;
	}
}
