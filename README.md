# Monash API (`api-monash`)

Express + TypeScript + Prisma 7 backend for the Monash College management system.

## Version

Release version follows **SemVer** in [`package.json`](./package.json) (`version`, currently **1.0.0**). Bump it when you ship breaking or feature releases.

Runtime responses include the same value:

- `GET /api/v1/` → `{ "version": "…", "apiVersion": "v1", … }`
- `GET /api/v1/health` → `{ "version": "…", "status": "Ok", … }`

## Setup

See [SETUP.md](./SETUP.md) for install, `.env`, database, and run instructions.
