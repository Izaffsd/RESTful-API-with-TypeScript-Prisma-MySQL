# Monash College — Backend API

REST API for the Monash College management system: students, lecturers, courses, documents, and auth (email/password + OAuth via Supabase).

## Tech stack

- **Runtime:** Node.js, TypeScript, Express 5  
- **Database:** **PostgreSQL** on **Supabase**, accessed with **Prisma 7**  
- **Auth:** Supabase Auth (JWT access tokens, httpOnly refresh cookies)  
- **Cache / limits:** Upstash Redis (rate limiting, OTP, refresh rotation, signed URL cache)  
- **Email:** Resend (optional; verification OTP, password reset, security notices)  
- **Validation:** Zod  

## Getting started (clone to running locally)

Boot the API **from this directory** (`api-ts-prisma`). It usually sits next to **`../frontend/`** in the same git repo; install and run the backend here only.

### Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 20.x or 22.x (LTS recommended) |
| **pnpm** | 9.x — this repo uses [`pnpm-lock.yaml`](./pnpm-lock.yaml); [`pnpm.io`](https://pnpm.io/installation) |
| **PostgreSQL** | Via [Supabase](https://supabase.com) (URLs and keys expected) |
| **Upstash Redis** | REST URL + token — rate limits, OTP, sessions cache |
| **Resend** (optional) | Transactional email; omit if unused |

### 1. Clone and enter this folder

```bash
git clone <your-repo-url> fullstack
cd fullstack/api-ts-prisma
```

If you only have this subtree, `cd` to the folder that contains `package.json` for `api-monash`.

### 2. Install dependencies

```bash
pnpm install
```

If `pnpm-lock.yaml` is out of date after a pull, run `pnpm install` again. CI uses `--frozen-lockfile`; commit the lockfile after dependency changes.

### 3. Environment variables

```bash
cp .env.example .env
```

Edit **`.env`**. The server validates required keys at startup (`src/config/env.ts`); invalid config exits with Zod errors.

| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `development` for local dev |
| `PORT` | HTTP port (e.g. `4000`) |
| `APP_URL` | Public API base URL (e.g. `http://localhost:4000`) |
| `FRONTEND_URL` | CORS origin(s); comma-separated for multiple (e.g. `http://localhost:3000`) |
| `DATABASE_URL` | Postgres (Supabase **pooler** is typical for the app) |
| `DIRECT_URL` | **Direct** Postgres (**5432**) — required for **Prisma migrations** (`prisma.config.ts`) |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` | Supabase project (service key is server-only) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash |

Optional: Resend (`RESEND_API_KEY`, `FROM_EMAIL`, …). Rate limits and Redis TTLs: see [`.env.example`](./.env.example).

**Swagger / OpenAPI UI:** With `NODE_ENV=development`, **`API_DOCS_ENABLED`** defaults **on** — open **`http://localhost:4000/api/v1/docs`**. In production it defaults **off**.

### 4. Database

```bash
pnpm run db:generate
pnpm run db:migrate
```

Use **`pnpm run db:push`** only for quick local prototyping (not ideal for shared or production databases).

### Row Level Security (Supabase)

Migrations include **RLS enabled** on application tables (`users`, `profiles`, `students`, `lecturers`, `head_lecturers`, `courses`, `documents`) with **no permissive policies**. That blocks accidental **PostgREST / anon-key** access while **Prisma** (owner connection) continues to work normally. If the Supabase Security Advisor still flags tables, run **`pnpm run db:migrate`** / **`prisma migrate deploy`** so the latest migration is applied.

### 5. Seed (optional)

```bash
pnpm run db:seed
```

See `prisma/seed.ts` and optional `SEED_HEAD_EMAIL` / `SEED_HEAD_PASSWORD` in `.env`.

### 6. Run

```bash
pnpm run dev
```

- **`GET /api/v1/`** — welcome / version  
- **`GET /api/v1/health`** — DB connectivity  
- **`GET /api/v1/docs`** — Swagger when docs are enabled  

Production: `pnpm run build && pnpm start`.

### Common setup issues

| Symptom | What to check |
|---------|----------------|
| `Invalid environment configuration` | All required `.env` keys; stray quotes |
| Migrations fail / timeout | `DIRECT_URL` must be **direct** Postgres (e.g. Supabase **5432**), not pooler-only |
| CORS from the browser | `FRONTEND_URL` must match origin exactly (scheme + host + port) |
| Redis / rate oddities | `UPSTASH_*` must match your Upstash project |
| CI `frozen-lockfile` fails | Run `pnpm install` locally and commit `pnpm-lock.yaml` |

### Full stack (Next.js)

After the API is healthy, use **[`../frontend/README.md`](../frontend/README.md)**. Set **`NEXT_PUBLIC_API_URL`** to the API origin and use the **same Supabase project** as the backend.

Monorepo overview: **[`../README.md`](../README.md)**.

---

## Version

- **npm package:** SemVer in [`package.json`](./package.json) (`version`).
- **Runtime welcome:** `GET /api/v1/` returns `{ message, version: "1.0.1", apiVersion: "v1", timestamp }` (see `src/routes/index.ts`) — not wrapped in the standard `response()` envelope.

Keep the welcome `version` string aligned with release notes when you ship API behaviour changes.

## Prisma

| Command | Purpose |
|---------|---------|
| `pnpm run db:generate` | Generate Prisma Client after clone or schema changes |
| `pnpm run db:push` | Sync schema to DB (no migration files) |
| `pnpm run db:migrate` | Create/apply migrations (team/production) |
| `pnpm run db:studio` | Open Prisma Studio UI |
| `pnpm run db:seed` | Run `prisma/seed.ts` via `prisma db seed` (courses + head lecturer + Supabase Auth) |
| `pnpm run db:clear` | Truncate all app tables (`prisma/clear-data.sql`) — **no** seed, **no** migrate; schema and `_prisma_migrations` stay |
| `pnpm run db:nuke` | **`DROP SCHEMA public CASCADE`** (`prisma/nuke-public.sql`) — removes **all** tables/types/enums in `public`; then run **`pnpm exec prisma migrate deploy`** to rebuild schema |

Default API base path: **`/api/v1`**. Dev / build / start commands are in **Getting started** above.

## Authentication

- **Access:** send `Authorization: Bearer <access_token>` on protected routes (except where noted).  
- **Refresh:** `POST /api/v1/auth/refresh` uses the **httpOnly** refresh cookie (and optional body); clients that use cookies should call it with `credentials: 'include'`.
- **OAuth (Google):** the browser completes PKCE with Supabase, then calls **`POST /api/v1/auth/oauth-session`** with the Supabase `refreshToken` so the API can set the same refresh cookie as email login. Edge cases return **`409 AUTH_EMAIL_CONFLICT_409`** or **`409 GOOGLE_LINK_CONSENT_409`** — see **[`../frontend/docs/auth-and-oauth-phase-1.0.1.md`](../frontend/docs/auth-and-oauth-phase-1.0.1.md)**.
- **Forgot / reset password:** when **Resend** + `FROM_EMAIL` are configured, the API emails a **single-use Redis token** (`/reset-password?token=…`); otherwise it falls back to **Supabase** `resetPasswordForEmail` (hash recovery in the browser). **`POST /api/v1/auth/reset-password`** accepts `token` + new password for the API-issued flow.

Role labels below: **STUDENT**, **LECTURER**, **HEAD** = `HEAD_LECTURER`.

### How users sign in (same login endpoint for all roles)

Everyone uses **`POST /api/v1/auth/login`** (email + password) or **OAuth** (e.g. Google) if enabled in Supabase. There is no separate “lecturer login” URL.

| Role | How the account is created | First sign-in |
|------|----------------------------|---------------|
| **Student** | Self-service **`POST /api/v1/auth/register`** (creates Supabase user + `users` as `STUDENT`) | After email verification (if required), use **login** with chosen password |
| **Lecturer** | A **head lecturer** creates them via **`POST /api/v1/lecturers`** (Supabase `createUser` + `LECTURER` + `lecturer` row; email is pre-confirmed) | **Login** with the email + temporary password set at creation (communicate password out-of-band) |
| **Head lecturer** | Another head lecturer via **`POST /api/v1/head-lecturers`**, or a **one-time bootstrap** (Supabase Dashboard + matching `users` / `head_lecturers` rows in Postgres) | Same **login** with that account’s password |

OAuth can still apply if the Supabase user has that provider linked—the API does not change per role.

### Bootstrap the first head lecturer (no API yet)

You need **Supabase Auth** and **Postgres** rows in sync:

1. **Supabase Dashboard → Authentication → Users → Add user** — set email and password; **copy the user’s UUID**.
2. **SQL Editor** (or any Postgres client on `DIRECT_URL`) — insert into `users` and `head_lecturers` using that UUID.

Replace placeholders (`YOUR_AUTH_USER_UUID`, staff number) with real values:

```sql
INSERT INTO users (user_id, type, status, name, created_at, updated_at)
VALUES (
  'YOUR_AUTH_USER_UUID'::uuid,
  'HEAD_LECTURER'::"UserType",
  'ACTIVE'::"UserStatus",
  'First Head Lecturer',
  NOW(),
  NOW()
);

INSERT INTO head_lecturers (head_lecturer_id, staff_number, user_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'HL00001',
  'YOUR_AUTH_USER_UUID'::uuid,
  NOW(),
  NOW()
);
```

Use a **unique** `staff_number` (max 10 chars per schema). Then sign in with **`POST /api/v1/auth/login`**. Further head lecturers can be created with **`POST /api/v1/head-lecturers`**.

## Response format

Most handlers use a single JSON envelope from `response()`. **Exceptions:** `GET /api/v1/` (welcome) and `GET /api/v1/health` use their own minimal JSON (no `success` / `statusCode` wrapper).

### Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Students retrieved successfully",
  "data": []
}
```

Paginated list endpoints add **`meta`** and **`links`** (not a single `pagination` object):

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Students retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "links": {
    "self": "/api/v1/students?page=1&limit=10",
    "next": "/api/v1/students?page=2&limit=10",
    "prev": null,
    "first": "/api/v1/students?page=1&limit=10",
    "last": "/api/v1/students?page=5&limit=10"
  }
}
```

`data` is omitted when there is no payload. Created resources often use **`statusCode`: 201**.

### Error

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid student number format",
  "errorCode": "INVALID_STUDENT_NUMBER_400",
  "timestamp": "2026-02-20T10:30:00.000Z",
  "errors": []
}
```

`errors` is an array of `{ "field": "…", "message": "…" }` when validation fails. Operational errors set `errorCode` (e.g. `UNAUTHORIZED_401`, `RATE_LIMIT_429`). Some 5xx responses may include an extra `data` payload for specific flows.

### Health (non-envelope)

`GET /api/v1/health` — `{ "status": "Ok" | "ERROR", "database": "connected" | "disconnected", "timestamp": "…" }`.

---

## API reference

All paths are prefixed with **`/api/v1`**.

### Root & utilities

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/` | — | Welcome / version info |
| GET | `/health` | — | DB connectivity |
| GET | `/enums` | Bearer | Reference lists (genders, races, states, …) |
| GET | `/stats` | Bearer + verified email | **LECTURER** or **HEAD** only |
| GET | `/test-error` | — | **development only** — triggers 500 test |

### Auth — `/auth`

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/auth/register` | — | Rate limited |
| POST | `/auth/login` | — | Rate limited |
| POST | `/auth/login-hint` | — | Rate limited |
| POST | `/auth/oauth-session` | — | Rate limited; OAuth refresh handoff |
| POST | `/auth/refresh` | — | Refresh cookie / body |
| POST | `/auth/logout` | Bearer | |
| POST | `/auth/resend-verification` | — | Rate limited |
| POST | `/auth/forgot-password` | — | Rate limited |
| POST | `/auth/verify-email` | — | Rate limited |
| POST | `/auth/reset-password` | — | Rate limited |
| GET | `/auth/me` | Bearer | |
| PATCH | `/auth/me` | Bearer | Display name |
| PATCH | `/auth/me/profile` | Bearer | Profile fields |
| PATCH | `/auth/me/password` | Bearer | Change / set password |

### Current user — `/me`

Router requires **Bearer + verified email**.

| Method | Path | Roles | Notes |
|--------|------|-------|--------|
| GET | `/me/student` | STUDENT | |
| PATCH | `/me/student` | STUDENT | MyKad |
| GET | `/me/course` | STUDENT | |
| GET | `/me/lecturer` | LECTURER | |
| PATCH | `/me/lecturer` | LECTURER | MyKad |
| GET | `/me/head-lecturer` | HEAD_LECTURER | |
| PATCH | `/me/head-lecturer` | HEAD_LECTURER | MyKad |
| GET | `/me/students` | LECTURER | Paginated (`page`, `limit`) |
| GET | `/me/documents` | Any verified | |
| POST | `/me/documents` | Any verified | `multipart/form-data` + category |
| DELETE | `/me/documents/:documentId` | Any verified | |

### Students — `/students`

Router: **Bearer + verified email**.

| Method | Path | Roles | Notes |
|--------|------|-------|--------|
| GET | `/students` | LECTURER, HEAD | Paginated + filters (query) |
| GET | `/students/:studentId` | LECTURER, HEAD | |
| POST | `/students` | HEAD | Create |
| PATCH | `/students/:studentId` | HEAD | Update |
| DELETE | `/students/:studentId` | HEAD | Soft delete |

### Courses — `/courses`

Router: **Bearer + verified email**.

| Method | Path | Roles | Notes |
|--------|------|-------|--------|
| GET | `/courses/list` | Any verified | Course options for selects (no pagination) |
| GET | `/courses` | LECTURER, HEAD | Paginated |
| GET | `/courses/:courseId` | LECTURER, HEAD | |
| POST | `/courses` | HEAD | |
| PATCH | `/courses/:courseId` | HEAD | |
| DELETE | `/courses/:courseId` | HEAD | |

### Lecturers — `/lecturers`

Router: **Bearer + verified email**. All routes **HEAD** only.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/lecturers` | Paginated |
| GET | `/lecturers/:lecturerId` | |
| POST | `/lecturers` | |
| PATCH | `/lecturers/:lecturerId` | |
| DELETE | `/lecturers/:lecturerId` | |

### Head lecturers — `/head-lecturers`

Router: **Bearer + verified email + HEAD**.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/head-lecturers` | Paginated |
| GET | `/head-lecturers/:headLecturerId` | |
| POST | `/head-lecturers` | |
| PATCH | `/head-lecturers/:headLecturerId` | |
| DELETE | `/head-lecturers/:headLecturerId` | |

### Documents (by entity)

Router: **Bearer + verified email**.

| Method | Path | Roles | Notes |
|--------|------|-------|--------|
| POST | `/students/:studentId/documents` | HEAD | `multipart/form-data` |
| GET | `/students/:studentId/documents` | LECTURER, HEAD | |
| POST | `/lecturers/:lecturerId/documents` | LECTURER, HEAD | `multipart/form-data` |
| GET | `/lecturers/:lecturerId/documents` | LECTURER, HEAD | |
| POST | `/head-lecturers/:headLecturerId/documents` | HEAD | `multipart/form-data` |
| GET | `/head-lecturers/:headLecturerId/documents` | HEAD | |
| DELETE | `/documents/:documentId` | HEAD | |

## One-liner setup (after `.env` is ready)

**Push schema (simple):**

```bash
pnpm install && pnpm run db:generate && pnpm run db:push && pnpm run dev
```

**Migrations (production-style):**

```bash
pnpm install && pnpm run db:generate && pnpm run db:migrate && pnpm run dev
```

### Do I need dummy data locally?

**No — to start the server.** The one-liners only install dependencies, generate the Prisma client, apply the **schema**, and run `dev`. Postgres can be **empty** and the API still boots.

**Yes — if you want a realistic student flow.** With an empty database there are **no courses**. Student numbers are tied to a **course**: the letter prefix of the student number must match an existing **`courseCode`** (e.g. `LAW` for `LAW0504`). Registration or `PATCH /auth/me/profile` with a student number will return **course not found** until someone creates that course.

Typical local options:

1. **`pnpm run db:seed`** (optional) — runs **`prisma/seed.ts`** (`prisma db seed`). Truncates the listed app tables, inserts **seven courses**, creates a **Supabase Auth** user, and inserts **`users` + `head_lecturers`** with matching `user_id` so you can sign in immediately. Requires **`SUPABASE_URL`**, **`SUPABASE_SERVICE_KEY`**, and **`DIRECT_URL`** or **`DATABASE_URL`**. Optional: **`SEED_HEAD_EMAIL`** (default in `prisma/seed.ts` is set for local testing), **`SEED_HEAD_PASSWORD`** (default `SeedHeadLecturer123!`). Override both in `.env` as needed.
2. **Manual API flow** — sign in as a **head lecturer** (if you skipped seed, create that user in Supabase + DB yourself), then use **`POST /api/v1/courses`** to add courses as needed.

Without courses (and without a head-lecturer account to create them), new students can still **register and log in**, but they **cannot** complete a valid student profile / student number until a matching course exists.

## CORS, cookies, and production

- Set **`FRONTEND_URL`** to your web app origin(s); comma-separated for multiple. The API enables CORS for those origins with credentials.  
- **Refresh cookies** are **httpOnly** and **SameSite=Strict** — the browser must call the API from an allowed origin (or same site) for cookie auth to work.  
- Use **`APP_URL`** and **`NODE_ENV=production`** with **HTTPS** in real deployments so cookies and redirects behave as expected.

## File uploads

Document uploads use **multipart** (`multipart/form-data`). Limits match the API config:

- **Max size:** 10 MB per file  
- **Allowed types:** JPEG, PNG, WebP, and PDF (profile pictures: JPEG / PNG / WebP only)  
- Stored in **Supabase Storage** (`profiles` / `documents` buckets), not on the API server disk.

## Troubleshooting

| Topic | What to check |
|-------|----------------|
| **Prisma migrate / `db:seed`** | Use a **direct** Postgres URL (**`DIRECT_URL`**, port **5432**) when Supabase pooler (**6543**) fails or times out. |
| **`DATABASE_URL` vs `DIRECT_URL`** | App runtime can use the **pooler**; migrations, **`prisma db seed`**, and **`pnpm run db:clear`** often need **direct** connection (see `prisma.config.ts` and `.env.example`). |
| **Redis / rate limit** | If Upstash is down, rate limiting **fails open** (requests are allowed). Check logs and dashboard. |
| **Secrets** | Never commit **`.env`**. **`SUPABASE_SERVICE_KEY`** and **`RESEND_API_KEY`** are **server-only** — do not expose them to browsers. |
| **Supabase “RLS disabled”** | Apply latest Prisma migrations (`20260408120000_enable_rls_all_tables`); app tables should have RLS on with no public policies (API-only access via Prisma). |
| **CI install** | Regenerate and commit **`pnpm-lock.yaml`** if `package.json` changed and CI uses `--frozen-lockfile`. |

## Repository layout

Overview of **`api-ts-prisma/`** (paths relative to this folder).

```
api-ts-prisma/
├── prisma.config.ts             # Prisma 7 config (datasource / migrate)
├── package.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                # `pnpm run db:seed`
│   ├── migrations/            # versioned SQL migrations
│   ├── clear-data.sql         # `pnpm run db:clear` — truncate app tables
│   └── nuke-public.sql        # `pnpm run db:nuke` — drop public schema
├── supabase/                  # reference SQL (e.g. storage policies)
├── logs/                      # file logs in dev (don’t commit secrets)
└── src/
    ├── app.ts                  # Express app: security headers, parsers, `/api/v1` mount
    ├── server.ts               # `listen` + graceful concerns
    ├── config/                 # env (Zod), db, redis, supabase, resend, ratelimit, upload
    ├── routes/                 # Routers mounted under `/api/v1`
    │   ├── index.ts            # welcome, health, Swagger `/docs`, utility routes, router merge
    │   ├── auth.routes.ts
    │   ├── me.routes.ts        # current user + my student/lecturer/head + documents
    │   ├── students.routes.ts
    │   ├── courses.routes.ts
    │   ├── lecturers.routes.ts
    │   ├── headLecturers.routes.ts
    │   └── documents.routes.ts # entity-scoped uploads/lists
    ├── controllers/            # HTTP handlers (thin)
    │   ├── auth.controller.ts
    │   ├── me.controller.ts
    │   ├── students.controller.ts
    │   ├── courses.controller.ts
    │   ├── lecturers.controller.ts
    │   ├── headLecturers.controller.ts
    │   ├── documents.controller.ts
    │   └── utility.controller.ts  # enums, stats, health, test-error (dev)
    ├── services/               # Domain + Prisma (no HTTP)
    │   ├── auth/               # credentials, oauth, session, password reset, verification, profile password, user payload
    │   │   ├── index.ts
    │   │   ├── credentials.service.ts
    │   │   ├── oauth.service.ts
    │   │   ├── session.service.ts
    │   │   ├── passwordReset.service.ts
    │   │   ├── verification.service.ts
    │   │   ├── profile.service.ts
    │   │   └── userPayload.ts
    │   ├── auth.service.ts     # facade / re-exports as needed
    │   ├── authBootstrap.service.ts
    │   ├── createEntityAccount.ts
    │   ├── students.service.ts
    │   ├── courses.service.ts
    │   ├── lecturers.service.ts
    │   ├── headLecturers.service.ts
    │   ├── me.service.ts
    │   ├── documents.service.ts
    │   └── stats.service.ts
    ├── middleware/
    │   ├── auth.middleware.ts
    │   ├── validateZod.middleware.ts
    │   ├── errorHandler.middleware.ts
    │   ├── rateLimit.middleware.ts
    │   └── requestId.middleware.ts
    ├── validations/          # Zod schemas per domain
    │   └── shared/           # pagination, ids, mykad, phone, …
    ├── redis/                 # Upstash helpers: OTP, refresh rotation, blacklist, reset tokens, signed URL cache
    ├── docs/
    │   └── openapiSpec.ts     # OpenAPI object for Swagger UI
    ├── utils/                 # response envelope, logger, pagination, cookies, storage, auth helpers, …
    │   └── emails/            # transactional templates (Resend)
    └── types/
        └── express.d.ts       # `req.user` augmentation
```

**Flow:** `routes/*` → `validateZod` / `auth` / `rateLimit` → `controllers/*` → `services/*` → Prisma / Supabase / Redis.

## License

Add a `LICENSE` file in this repo if you open-source the project (e.g. MIT). This README does not impose a license by itself.
