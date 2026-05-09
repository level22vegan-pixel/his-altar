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
  - `/` — Login page: all 22 Hebrew letters displayed, users click in order then press Enter. ת held 3s → admin access
  - `/home` — Post-login landing page with "Select Campus" button (6 campuses)
  - `/campus/hallmark` — Hallmark campus page with 4 service time buttons
  - `/checkin?campus=X&service=Y` — Check-in page: 3-tab slider (Roster | Active | Alt)
  - `/admin` — Admin panel: Altar Report, Roster Manager, login sequence editor
  - `/admin/altar-report` — Log and export altar responses (PDF/Excel)
  - `/admin/roster` — Add/remove master and alt roster workers

### Dbanc — Prayer Contact Database
- **Entry point**: `/admin/dbanc`
- **Pages**:
  - `/admin/dbanc` — Contact list dashboard with search, edit, delete
  - `/admin/dbanc/new` — Add new contact (first name, last name, phone, carrier, gender, campus, prayer notes, custom fields)
  - `/admin/dbanc/contacts/:id` — Edit existing contact
  - `/admin/dbanc/fields` — Admin: manage custom "other info" fields (text / dropdown / yes-no types)

### PXP — Prayer Follow-Up Call System
- **Entry point**: `/admin/pxp`
- **Pages**:
  - `/admin/pxp` — Select caller name + campus, choose contact from Dbanc, start call
  - `/admin/pxp/call?contactId=X&callerName=Y&campus=Z` — Branching script walkthrough; auto-fills {contact_name}, {caller_name}, {campus}; response buttons advance the script tree; logs outcome on completion
  - `/admin/pxp/logs` — History of all logged calls
  - `/admin/pxp/script` — Admin: edit every node of the script tree (text + response button labels)

### API Server (`artifacts/api-server`)
- **Preview path**: `/api`
- **Routes**:
  - `POST /api/auth/verify` — verify a submitted letter sequence
  - `GET /api/config/login-code` — get current login code (admin)
  - `PUT /api/config/login-code` — update login code (requires admin password)
  - `GET /api/workers?category=master|alt` — list roster workers
  - `POST /api/workers` — add a worker `{ name, role, category, photoUrl }`
  - `DELETE /api/workers/:id` — remove a worker
  - `GET /api/check-ins?campus=X&service=Y&serviceDate=Z` — get check-ins for a session
  - `POST /api/check-ins` — check in a worker `{ workerId, campus, service, serviceDate }`
  - `DELETE /api/check-ins/:id` — check out a worker
  - `GET/POST/DELETE /api/altar-reports` — altar response entries
  - `GET /api/dbanc/contacts` — list all prayer contacts
  - `POST /api/dbanc/contacts` — add contact `{ firstName, lastName, phone, carrier, gender, campus, notes, customData }`
  - `GET/PUT /api/dbanc/contacts/:id` — get/update a contact
  - `DELETE /api/dbanc/contacts/:id` — remove a contact
  - `GET /api/dbanc/custom-fields` — list admin-defined custom fields
  - `POST /api/dbanc/custom-fields` — add custom field `{ label, fieldType, options, sortOrder }`
  - `PUT/DELETE /api/dbanc/custom-fields/:id` — update/remove custom field
  - `GET /api/pxp/config` — get PXP config (church name + script tree JSON)
  - `PUT /api/pxp/config` — update PXP config (save edited script tree)
  - `GET /api/pxp/call-logs` — list call logs (optionally filter by contactId)
  - `POST /api/pxp/call-logs` — log a completed call `{ contactId, callerName, campus, outcome, notes }`

## Database Schema

### `dbanc_contacts`
Prayer contact records:
- `id`, `first_name`, `last_name`, `phone`, `carrier`, `gender`, `campus`, `notes` — core fields
- `custom_data` — JSONB for admin-defined extra fields
- `created_at`, `updated_at`

### `dbanc_custom_fields`
Admin-configurable extra contact fields:
- `id`, `label`, `field_type` (text/select/boolean), `options` (JSONB array), `sort_order`, `created_at`

### `pxp_config`
PXP script tree and settings (one row, updated in place):
- `id`, `church_name`, `script_tree` (JSONB branching tree), `updated_at`

### `pxp_call_logs`
Log of completed follow-up calls:
- `id`, `contact_id`, `caller_name`, `campus`, `outcome`, `notes`, `called_at`

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
