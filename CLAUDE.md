@AGENTS.md

# Cubes+ v2 — Training Routine Builder

**Stack:** Next.js 15 + Prisma 7 + PostgreSQL + Tailwind CSS 4 + Zustand + TanStack Query

**System design:** `~/projects/LIMITLESS/docs/superpowers/specs/2026-03-31-cubes-plus-v2-system-design.md`

## Entity Naming (NON-NEGOTIABLE)

| Old (v1) | New (v2) |
|----------|----------|
| Cube | Exercise |
| Routine | Session |
| Super-Routine | Program |

Never use the old names in code, comments, or UI.

## Commands

```bash
# Required before all pnpm/node commands (fnm Node path)
export PATH="/home/nefarious/.local/share/fnm/node-versions/v20.20.2/installation/bin:$PATH"

pnpm install          # Install dependencies
npx prisma generate   # Generate Prisma client (required before build)
pnpm build            # Production build
pnpm dev              # Dev server
npx tsx prisma/seed.ts  # Seed database
```

## Auth

Cookie-based JWT via shared `payload-token` from PATHS SSO. Middleware in `src/middleware.ts` reads the cookie, verifies JWT, syncs user on first login.

## API Routes

All API routes at `/api/v1/*`. RESTful pattern with Zod validation.

## Prisma 7 Gotchas

- Connection URL is in `prisma.config.ts`, NOT in `schema.prisma`
- PrismaClient uses lazy proxy pattern (`src/lib/prisma.ts`)
- Run `npx prisma generate` before `pnpm build` (included in CI)
- Schema migration: `npx prisma db push` (dev) or `npx prisma migrate deploy` (prod)

## Render Deployment

- Web service: `limitless-cubes`
- Build: `npm install -g pnpm && pnpm install --frozen-lockfile && npx prisma generate && pnpm run build`
- Start: `node .next/standalone/server.js`
- Output mode: `standalone`

## Hard Constraints

- NEVER commit `.env*`, `.claude/`, or temporary test files
- ALWAYS run `npx prisma generate` before building
- ALWAYS use the fnm Node path before running any commands
