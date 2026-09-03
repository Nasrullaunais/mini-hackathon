# Mini Hackathon

Next.js 16 · Postgres (Neon) · Drizzle · shadcn/ui · Tailwind v4 · deployed on Vercel.

> **Read [GUIDELINES.md](./GUIDELINES.md) before writing code.** It covers the
> workflow, the feature pattern, git rules, and the 4-hour plan.

## Topic

_Fill this in once the team picks._

## Quick start

```bash
npm install
cp .env.example .env.local
npm run db:up      # local Postgres on port 5442
npm run db:push    # create tables
npm run db:seed    # sample data
npm run dev
```

- App — <http://localhost:3000>
- Reference CRUD — <http://localhost:3000/items>
- Health check — <http://localhost:3000/api/health>

## Where things live

| Path | What |
|---|---|
| `src/db/schema.ts` | All tables. Single owner — see GUIDELINES §5. |
| `src/db/index.ts` | Drizzle client. Never instantiate Postgres elsewhere. |
| `src/lib/actions/` | Server actions, one file per feature. |
| `src/app/<feature>/` | Routes. |
| `src/components/<feature>/` | Feature components. |
| `src/components/ui/` | shadcn components. Re-add rather than hand-edit. |

The `items` feature is a complete reference CRUD slice: read it, then copy it.
