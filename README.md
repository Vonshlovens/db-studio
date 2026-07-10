# DB Studio

DB Studio is a SvelteKit application for importing, editing, visualizing, and persisting database
diagrams.

## Local development

Requirements: [Bun](https://bun.sh/) and a current web browser.

```sh
bun install
cp .env.example .env
bun run db:migrate
bun run dev
```

With `DATABASE_URL` empty, local commands use `file:./data/db-studio.db`. Useful commands:

```sh
bun run db:generate  # generate a migration after changing the Drizzle schema
bun run db:migrate   # apply committed migrations
bun run db:studio    # inspect the configured database
bun run check
bun run test
bun run build
```

## Docker quick start

Docker Compose runs committed migrations, starts the app on port 3000, and persists the local
libSQL database in a named volume:

```sh
docker compose up --build -d
docker compose ps
```

Open <http://localhost:3000>. Stop the stack with `docker compose down`; do not add `--volumes`
unless you intend to delete the local database.

For TLS, remote Turso configuration, backups, upgrades, reverse-proxy guidance, and ownership
caveats, see [Self-hosting DB Studio](docs/SELF_HOSTING.md).
