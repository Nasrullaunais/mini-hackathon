# Agent instructions

Read `GUIDELINES.md` first — it is the source of truth for this repo. Highlights that
AI assistants get wrong most often:

## shadcn is the Base UI style, NOT Radix

`components.json` sets `"style": "base-nova"`. Components import from
`@base-ui/react/*`, not `@radix-ui/*`.

- **No `<Form>` component exists.** Use `Field`, `FieldLabel`, `FieldGroup`,
  `FieldError` from `@/components/ui/field`.
- **No `asChild` prop.** Base UI uses `render`:
  `<Button render={<Link href="/x" />}>Go</Button>`
- Do not `npm install @radix-ui/*`. Do not hand-write components from memory —
  run `npx shadcn@latest add <name>`.

## Data access

- Drizzle ORM, schema in `src/db/schema.ts`, client in `src/db/index.ts`.
- Import the shared `db` from `@/db`. Never call `postgres()` or `drizzle()` anywhere else.
- Never import `@/db/*` from a `"use client"` component.
- Schema changes ship via `npm run db:push`. Do not generate migration files.

## Feature pattern

Server Components read; Server Actions write. Do not add a `route.ts` and then fetch
it from your own pages — that is the wrong pattern here. Route handlers are only for
external callers.

Server actions must: validate with Zod, `revalidatePath` after writing, and **return**
`{ error: string }` rather than throwing. See `src/lib/actions/items.ts`.

## Before claiming a task is done

```bash
npm run typecheck && npm run build
```

Both must pass. This is a 4-hour hackathon: prefer the smallest change that works,
match the existing patterns in `src/app/items/` and `src/lib/actions/items.ts`, and do
not introduce new libraries or abstractions without being asked.
