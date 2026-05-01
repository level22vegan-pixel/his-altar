# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Hebrew Login Portal (`artifacts/hebrew-login`)
- **Preview path**: `/`
- **Purpose**: A rustic Hebrew alphabet login page where users click letters in sequence to authenticate
- **Pages**:
  - `/` — Login page: all 22 Hebrew letters displayed, users click in order then press Enter
  - `/home` — Post-login landing page with "Select Campus" button
  - `/admin` — Admin panel to update the login sequence (password protected)

### API Server (`artifacts/api-server`)
- **Preview path**: `/api`
- **Routes**:
  - `POST /api/auth/verify` — verify a submitted letter sequence
  - `GET /api/config/login-code` — get current login code (admin)
  - `PUT /api/config/login-code` — update login code (requires admin password)

## Database Schema

### `login_config`
Stores the login code sequences (each insert creates a new row; latest is used):
- `id` — serial primary key
- `code` — integer array of letter numbers in order
- `updated_at` — timestamp

## Hebrew Alphabet Numbering
Each letter has a hidden number (1–22) in order:
א=1, ב=2, ג=3, ד=4, ה=5, ו=6, ז=7, ח=8, ט=9, י=10, כ=11, ל=12, מ=13, נ=14, ס=15, ע=16, פ=17, צ=18, ק=19, ר=20, ש=21, ת=22

Default login (YESHUA): י(10), ש(21), ו(6), ע(16), א(1)

## Admin Password
Default admin password (set via `ADMIN_PASSWORD` env var): `admin1234`
