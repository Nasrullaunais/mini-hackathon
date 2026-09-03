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

- Drizzle ORM, schema in `src/db/schema.ts`.
- Import the shared `db` from `@/db`. Never call `postgres()` or `drizzle()` anywhere else.
- `@/db` is guarded with `server-only`, so importing it from a client component is a
  build error. `@/db/client` bypasses that guard and is for Node scripts (seed) only —
  ESLint blocks it in app code.
- Schema changes ship via `npm run db:push`. Do not generate migration files.

## Validation

- Zod schemas live in `src/lib/validations/<entity>.ts` and are **derived from the
  Drizzle table** with `drizzle-zod` (`createInsertSchema`). Do not hand-write a
  schema that restates columns — it will drift.
- The Server Action and the route handler share the **same** schema. Never two copies.
- `.pick()` only the fields the form owns. Zod strips unknown keys; that is the
  defence against a client setting `id` or `done`.
- Error messages are user-facing prose: `"Title is required"`, not `"Invalid input"`.

## Feature pattern

Server Components read; Server Actions write. Do not add a `route.ts` and then fetch
it from your own pages — that is the wrong pattern here. Route handlers are only for
external callers.

Server actions must: validate via `parseForm(schema, formData)`, `revalidatePath`
after writing, and **return** an `ActionState` rather than throwing:

```ts
const parsed = parseForm(itemFormSchema, formData);
if (!parsed.ok) return parsed.state;
await db.insert(items).values(parsed.data);
return actionSuccess(undefined, "Item created");
```

See `src/lib/actions/items.ts` and `src/lib/form.ts`.

## Lint

The ESLint config is deliberately strict about AI-typical mistakes: missing `await`
on Drizzle calls, `any`, unused leftovers, impossible conditions, `try/catch` that
only rethrows, `fetch` inside `useEffect`.

**Do not silence a rule to make the build pass.** `@ts-ignore` is banned;
`@ts-expect-error` requires a written reason. Fix the underlying issue.

## Before claiming a task is done

```bash
npm run verify     # typecheck + lint + build
```

All three must pass. This is a 4-hour hackathon: prefer the smallest change that works,
match the existing patterns in `src/app/items/` and `src/lib/actions/items.ts`, and do
not introduce new libraries or abstractions without being asked.
