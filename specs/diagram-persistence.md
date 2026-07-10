# Diagram Persistence

## Purpose

Persist multiple diagrams per anonymous browser without exposing one visitor's diagrams to another.

## Ownership

- The server assigns each browser an opaque UUID in the `db-studio-owner` cookie.
- The cookie is `httpOnly`, `sameSite=lax`, available to the whole application, and `secure` outside development.
- Anonymous ownership is not an account or an authentication mechanism. Clearing or losing the cookie makes its diagrams inaccessible.
- Every diagram read, update, and delete is scoped by both diagram ID and owner ID. IDs alone never grant access.

## Stored Data

Each diagram contains:

- `id`: server-generated UUID
- `ownerId`: anonymous browser owner UUID
- `name`: trimmed display name, 1–200 characters
- `schema`: JSON matching the current `Schema` type
- `layout`: JSON matching the current `LayoutState` type
- `createdAt` and `updatedAt`: server timestamps

Schema and layout are stored as separate JSON documents. Existing schema fields, including table position and color, are preserved for compatibility. Transient `UIState` is not persisted.

## HTTP API

All responses are JSON except successful deletion.

| Method | Path | Behavior |
|---|---|---|
| `GET` | `/api/diagrams` | List the current owner's diagram summaries, newest update first |
| `POST` | `/api/diagrams` | Create a diagram from `{ name, schema, layout }` |
| `GET` | `/api/diagrams/[id]` | Return one owned diagram |
| `PUT` | `/api/diagrams/[id]` | Replace its name, schema, and layout |
| `PATCH` | `/api/diagrams/[id]` | Update one or more of name, schema, and layout |
| `DELETE` | `/api/diagrams/[id]` | Delete an owned diagram and return `204` |
| `GET` | `/api/health` | Run `SELECT 1`; return `200` when reachable or `503` otherwise |

Create returns `201`. Missing diagrams return `404`, including IDs owned by another browser. Invalid request bodies return `400`. Diagram timestamps are returned as ISO 8601 strings.

## Database Configuration

- `DATABASE_URL` accepts local libSQL file URLs and remote Turso URLs.
- `DATABASE_AUTH_TOKEN` is optional and is passed to libSQL when set.
- Development and build-time tooling default to `file:./data/db-studio.db`.
- Production runtime and production migration commands require an explicit `DATABASE_URL`.
- Schema changes are managed through committed Drizzle SQL migrations.

## Non-goals

- Login, account recovery, sharing, and collaboration
- Persisting selection, context menus, or other UI state
- Automatic conflict resolution or version history
