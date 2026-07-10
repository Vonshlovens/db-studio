# Self-hosting DB Studio

The supported default deployment is one Bun application container backed by an embedded local
libSQL database. A one-shot container applies the committed Drizzle migrations before the
application starts. No database port or unauthenticated libSQL server is exposed.

## Local Docker deployment

Requirements: Docker Engine with the Compose v2 plugin.

```sh
cp .env.example .env
docker compose up --build -d
docker compose ps
```

The defaults publish <http://localhost:3000>, use `DATABASE_URL=file:/data/db-studio.db`, and keep
the database in the Compose-managed `db-data` named volume. The application runs as the
unprivileged `bun` user and has a restart policy. `docker compose down` retains the volume;
`docker compose down --volumes` permanently deletes it.

The `migrate` service must exit successfully before `app` starts. It is safe to run it again:

```sh
docker compose run --rm migrate
docker compose up -d app
```

The container and Compose health checks call `/api/health`, which verifies database access. View
status and logs with:

```sh
docker compose ps
docker compose logs migrate app
```

## Public URL and TLS

Set `ORIGIN` to the exact externally visible origin, including `https` and any nonstandard port:

```dotenv
ORIGIN=https://studio.example.com
APP_PORT=3000
```

The Bun adapter uses `ORIGIN` to construct the effective request URL. DB Studio marks its
anonymous-owner cookie `Secure` when that URL uses HTTPS. Plain HTTP therefore works for an
intentional localhost or private-network deployment, but an internet-facing deployment must
terminate TLS at a trusted reverse proxy.

Compose deliberately does not trust `X-Forwarded-*` headers. A fixed `ORIGIN` is safer. Only use
the adapter's `PROTOCOL_HEADER` and `HOST_HEADER` settings if every request passes through a
trusted proxy that removes client-supplied forwarding headers.

## Turso Cloud

The same image and migration service support a remote authenticated Turso database. Put the
values in the ignored `.env` file:

```dotenv
DATABASE_URL=libsql://your-database-your-org.turso.io
DATABASE_AUTH_TOKEN=replace-with-a-turso-token
ORIGIN=https://studio.example.com
APP_PORT=3000
```

Then deploy normally:

```sh
chmod 600 .env
docker compose up --build -d
```

No application code or Compose override is needed. The local named volume remains attached but is
unused while `DATABASE_URL` points to Turso. Protect `.env` and rotate the Turso token if it is
exposed. Use Turso's backup and recovery facilities for a remote database.

## Backup and restore

Stop the application before copying an embedded database so that its main file and any companion
files form a consistent set:

```sh
backup_dir="./backups/db-studio-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
docker compose stop app
docker compose cp app:/data/. "$backup_dir/"
docker compose start app
```

Store the backup outside the Docker host and test restores. To restore, stop `app`, copy the
complete saved directory back to `/data`, ensure it is owned by the image's `bun` user, and then
start `app`. Take a fresh backup before overwriting a volume.

If an older or manually created volume is not writable, repair its ownership once:

```sh
docker compose run --rm --no-deps --user root --entrypoint sh app \
  -c 'chown -R bun:bun /data'
```

## Upgrades

Pull the new source or image, back up the database, and recreate the stack:

```sh
docker compose up --build -d
docker compose ps
```

The migration gate applies only new committed migrations before the replacement app starts. Do
not run multiple independent migration jobs against the same database during an upgrade.

## Anonymous ownership

DB Studio has no user accounts. A browser owns its diagrams through the long-lived,
`httpOnly` `db-studio-owner` cookie:

- clearing site data, losing the browser profile, or changing hostnames makes existing diagrams
  inaccessible through the UI;
- a database backup does not back up browser cookies or provide account recovery;
- keep the same public hostname during upgrades, and preserve the browser profile when access to
  existing diagrams matters;
- HTTPS protects the ownership cookie on internet-facing deployments. Do not expose production
  data over plain HTTP.

Diagram IDs alone do not grant access; API operations are also scoped to the cookie's owner ID.
