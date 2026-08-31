#!/usr/bin/env bash
set -euo pipefail

# Bun is the project's package manager and runtime (see README). Install it if the
# base image / snapshot does not already provide it. Idempotent: skips when present.
if ! command -v bun >/dev/null 2>&1 && [ ! -x "$HOME/.bun/bin/bun" ]; then
	curl -fsSL https://bun.sh/install | bash
fi
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# Install dependencies exactly as pinned in bun.lock.
bun install --frozen-lockfile

# Provide local defaults for development if no .env exists yet. With DATABASE_URL
# empty, the app and Drizzle use file:./data/db-studio.db.
if [ ! -f .env ]; then
	cp .env.example .env
fi

# Apply committed database migrations against the local libSQL database.
bun run db:migrate
