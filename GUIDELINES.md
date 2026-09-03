# Hackathon Guidelines

**4 hours. 4 people. One CRUD app. A 2-minute demo video at the end.**

Everything below exists so nobody spends hackathon time on setup, merge conflicts, or
"it works on my machine". Read this once, fully, before you write code.

---

## 1. Setup (do this BEFORE the clock starts)

```bash
git clone https://github.com/Nasrullaunais/mini-hackathon.git
cd mini-hackathon
npm install
cp .env.example .env.local     # local Docker DB by default
npm run db:up                  # starts Postgres on port 5442
npm run db:push                # creates tables from src/db/schema.ts
npm run db:seed                # optional sample rows
npm run dev
```

Open <http://localhost:3000>. You should see the landing page.
Open <http://localhost:3000/items> — that is the **reference CRUD**. Copy its shape.
Open <http://localhost:3000/api/health> — must return `{"ok":true,"db":"up"}`.

If health is not ok, your database is not reachable. Fix that before anything else.

### Using the shared Neon database instead

Production runs on Neon. To point your local app at it:

```bash
npx vercel login          # once
npx vercel link --yes     # once
npm run env:pull          # writes DATABASE_URL into .env.local
```

**Which should you use?** Local Docker while building features. Neon when you need to
check something against real deployed data. Local is faster and you cannot break
anyone else's work with a bad migration.

---

## 2. The stack, and what each piece is for

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Client **and** server in one project |
| UI | shadcn/ui (`base-nova` style, Base UI) | Components live in `src/components/ui/` |
| Styling | Tailwind CSS v4 | No config file — theme is in `src/app/globals.css` |
| DB | Postgres | Docker locally, Neon in production |
| ORM | Drizzle | Schema in `src/db/schema.ts` |
| Validation | Zod | Every input crossing the network gets validated |
| Deploy | Vercel | Auto-deploys on push |

### shadcn gotcha — read this

This project uses shadcn's **Base UI** style, not the older Radix one. Two consequences:

- There is **no `<Form>` component.** Use `<Field>` from `@/components/ui/field`.
- There is **no `asChild` prop.** Use `render` instead:
  ```tsx
  // WRONG (Radix style, will not compile)
  <Button asChild><Link href="/x">Go</Link></Button>

  // RIGHT (Base UI style)
  <Button render={<Link href="/x" />}>Go</Button>
  ```

Most AI assistants and most blog posts will give you the Radix version. If a snippet
does not compile, this is why.

---

## 3. Project structure — where things go

```
src/
  app/
    page.tsx                 landing
    layout.tsx               root layout + <Toaster />
    items/page.tsx           REFERENCE: server component that reads the DB
    api/health/route.ts      deployment smoke test
    api/items/route.ts       REFERENCE: REST handlers (only if you need REST)
  components/
    ui/                      shadcn components — DO NOT hand-edit, re-add instead
    items/                   REFERENCE: feature components
  db/
    schema.ts                ALL tables. One owner. See rule 5.
    index.ts                 server-only db entry — import { db } from "@/db"
    client.ts                raw connection. Node scripts only, never app code.
    seed.ts                  sample data
  lib/
    validations/items.ts     REFERENCE: Zod schemas derived from the table
    actions/items.ts         REFERENCE: server actions
    form.ts                  ActionState + parseForm() helper
    utils.ts                 cn() helper
```

**Rule: one folder per feature** under `src/components/`, `src/app/`, and
`src/lib/actions/`. If you own "orders", you touch `components/orders/`,
`app/orders/`, `lib/actions/orders.ts`. Nobody else touches those. This is how four
people avoid merge conflicts.

---

## 4. How to write a feature (the only pattern you need)

Default to **Server Components + Server Actions**. Do not build REST endpoints and
then fetch them from your own pages — that is twice the code and twice the bugs.

**Read data** — server component, `async`, query directly:

```tsx
// src/app/orders/page.tsx
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return <OrderList orders={rows} />;
}
```

**Write data** — server action: validate, write, revalidate, return an `ActionState`:

```ts
// src/lib/actions/orders.ts
"use server";

export async function createOrder(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(orderFormSchema, formData);
  if (!parsed.ok) return parsed.state;

  await db.insert(orders).values(parsed.data);

  revalidatePath("/orders");
  return actionSuccess(undefined, "Order created");
}
```

**Wire the form** — client component with `useActionState`:

```tsx
"use client";
const [state, formAction, isPending] = useActionState(createOrder, idleState);
```

Read `src/lib/actions/items.ts`, `src/app/items/page.tsx`, and
`src/components/items/` end to end once. Then copy them. That is the fastest path.

**Only write a `route.ts`** when something outside your own pages calls it — a
webhook, an external client, a cron.

### Non-negotiables

- `"use client"` only on components that need state, effects, or event handlers.
  Push it as far down the tree as possible.
- Server actions **return** an `ActionState`, they do not throw at the user.
- Validate every `FormData` and every JSON body with Zod. No exceptions.
- Never import `@/db` into a client component. It is guarded with `server-only`,
  so this is a build error, not a silent leak.
- Never put secrets in a `NEXT_PUBLIC_*` variable.

---

## 4b. Validation (Zod)

Schemas live in `src/lib/validations/<entity>.ts` and are **derived from the Drizzle
table** with `drizzle-zod`, so a column rename becomes a type error instead of a
runtime surprise. Never hand-write a schema that duplicates the table.

```ts
// src/lib/validations/items.ts
export const itemFormSchema = createInsertSchema(items, {
  title: (schema) => schema.trim().min(1, "Title is required").max(200, "..."),
})
  .pick({ title: true })
  .extend({ description: optionalText(2000, "Description") });
```

Rules:

- **One schema per entity, reused everywhere** — the Server Action and the route
  handler import the *same* schema. Two copies will drift within the hour.
- **Error messages are user-facing.** `"Title is required"`, not `"Invalid input"`.
- **`.pick()` what the form owns.** Never let a client set `id`, `createdAt`, or
  `done` through a create form — Zod strips unknown keys, and that is the point.

In a Server Action, use the `parseForm` helper — it returns a discriminated union so
you cannot forget the failure branch:

```ts
const parsed = parseForm(itemFormSchema, formData);
if (!parsed.ok) return parsed.state;   // field errors, already formatted
await db.insert(items).values(parsed.data);
return actionSuccess(undefined, "Item created");
```

Every action returns `ActionState`:

```ts
{ status: "idle" | "success" | "error", message?, fieldErrors?, data? }
```

The form renders `state.fieldErrors?.<name>` under the matching input via
`<FieldError>`, and toasts `state.message`. See `src/components/items/item-form.tsx`.

---

## 4c. Lint rules (and why they exist)

`npm run lint` is tuned to catch the mistakes AI assistants actually make. Errors are
things that will bite you during the demo; warnings are smells.

| Rule | Why it is here |
|---|---|
| `no-floating-promises` (with `checkThenables`) | **The important one.** A missing `await` on `db.insert(...)` returns before the write lands. Drizzle builders are custom thenables, so this needs `checkThenables: true` to be caught at all. |
| `no-misused-promises` | `onClick={async …}` where the rejection vanishes. |
| `no-explicit-any` + `no-unsafe-*` | `any` silently disables every other rule downstream. |
| `unused-imports/*` | AI leaves scaffolding behind on every edit. |
| `no-unnecessary-condition` | Flags defensive checks that can never be false — the classic sign of code written without reading the types. |
| `no-useless-catch` | `try { … } catch (e) { throw e }` wrappers. |
| `no-restricted-imports` | Blocks `@/db/client` (bypasses the `server-only` guard) and `../../` climbing. |
| `no-restricted-syntax` | Flags `fetch` inside `useEffect` (load in a Server Component instead) and TS `enum`. |

`src/components/ui/**` is ignored — it is generated by shadcn. Re-add components
rather than hand-editing them.

**Do not disable a rule to make the build pass.** `@ts-ignore` is banned outright;
`@ts-expect-error` requires a written reason. If a rule is genuinely wrong, say so in
the PR and change the config once for everyone.

---

## 5. Database rules

**One person owns `src/db/schema.ts`.** Decide who in the first 15 minutes. Everyone
else asks that person for a column. Two people editing the schema concurrently is the
single most likely way to lose 30 minutes today.

Change the schema:

```bash
# edit src/db/schema.ts, then:
npm run db:push        # syncs your LOCAL db, no migration files
```

We use `db:push`, **not** generated migrations. It is the right trade-off for four
hours. It means the schema is whatever `schema.ts` says.

```bash
npm run db:studio      # browse data in a GUI
npm run db:reset       # nuke local db and start clean
npm run db:seed        # reload sample rows
```

**Before the demo**, the schema owner runs `db:push` once against Neon so production
matches. Pull the Neon URL first (`npm run env:pull`), push, then switch back to local.

Conventions: `snake_case` column names in the DB, `camelCase` in TypeScript (Drizzle
maps them). Every table gets `id` (uuid), `createdAt`, `updatedAt`.

---

## 6. Git workflow

`main` is always deployable. Never push broken code to `main`.

```bash
git checkout -b feat/orders
# work
npm run verify                          # typecheck + lint + build, all must pass
git add -A && git commit -m "feat: order list and create form"
git push -u origin feat/orders
```

Open a PR. Vercel comments a **preview URL** on it — click it, check your feature
actually works deployed. Get one teammate to merge it.

- Small commits, push often. A branch that lives 3 hours will conflict.
- Merge to `main` at least every 45 minutes. Do not save it all for the end.
- If you hit a conflict in `src/db/schema.ts`, stop and talk to the schema owner.
- Do not commit `.env.local`. It is gitignored — keep it that way.

---

## 7. Deployment

**Production URL:** <https://mini-hackathon-gen-x5.vercel.app>
**Vercel project:** `gen-x5/mini-hackathon`

Once the repo is connected (see §7.1), pushing to `main` deploys to production
automatically and every PR gets a preview URL. Until then, deploy manually:

```bash
npm run deploy      # production deploy
npx vercel logs     # runtime logs when production misbehaves
```

After any deploy, open `/api/health` on the production URL. If it says `db: down`,
`DATABASE_URL` is missing in Vercel — check `npx vercel env ls`.

### 7.1 Owner setup — already done

- ✅ **Neon provisioned** (Free plan) and connected to Production, Preview, and
  Development. `DATABASE_URL` and the `PG*`/`POSTGRES_*` vars are set in Vercel.
- ✅ **Schema pushed and seeded** on Neon.
- ✅ **GitHub connected** — pushes to `main` deploy to production, PRs get previews.

Nothing to redo. To confirm at any point:

```bash
npx vercel env ls
npx vercel curl https://mini-hackathon-gen-x5.vercel.app/api/health
# -> {"ok":true,"db":"up"}
```

### 7.2 Known limitation — the production URL is behind Vercel SSO

Production sits behind Vercel Authentication and **we cannot turn it off** — that
setting requires a Pro plan, and this account has no personal Hobby scope to fall
back to. Anyone hitting the URL without a GenX team account gets a login page.

What this does and does not break:

- **Recording the demo video: unaffected.** Whoever records is signed in to Vercel,
  so the app loads normally. The video is the deliverable — record the deployed URL
  as planned.
- **A judge clicking the link: blocked.** They would land on a Vercel login page.

If a publicly clickable URL is required, decide **before** the event, not during:

1. Add the judges as members of the GenX Vercel team (they can then sign in), or
2. Start Vercel's Pro trial and set Vercel Authentication to Disabled, or
3. Accept it and lead with the video plus a `git clone` + `npm run dev` fallback.

Do not spend hackathon time on this. It is a 10-minute problem before the clock
starts and a 60-minute problem at 3:45.

---

## 8. The 4-hour plan

| Time | What |
|---|---|
| 0:00–0:15 | Pick the topic. Agree the data model on paper. Assign the schema owner. Split into 4 feature slices with **no overlapping folders**. |
| 0:15–0:30 | Schema owner writes `schema.ts` and pushes it. Everyone else scaffolds their route and stubs their UI. |
| 0:30–2:30 | Build. Merge to `main` every 45 min. |
| 2:30–3:00 | **Feature freeze.** Only bug fixes after this. Deploy to production and test the live URL. |
| 3:00–3:30 | Polish: empty states, loading states, error toasts, a title that is not "Create Next App". Seed realistic-looking demo data. |
| 3:30–4:00 | Record the video. |

**Feature freeze at 2:30 is the most important line in this document.** A working
small app demos far better than a broken ambitious one.

---

## 9. The demo video (2 minutes)

Record the **deployed Vercel URL**, not localhost. Make sure the browser you record
in is signed in to Vercel (see §7.2). Write the script before you record.

A structure that works:

- **0:00–0:15** — What the app is and who it is for. One sentence.
- **0:15–1:30** — The core flow, done live: create something, see it in the list,
  edit it, delete it. Move slowly and narrate what you are clicking.
- **1:30–1:50** — One thing you are proud of. Anything real.
- **1:50–2:00** — Stack in one line, and the live URL on screen.

Practical: seed good demo data first (no "asdf" rows), close every other browser tab,
hide bookmarks, use an incognito window, and do one dry run before the real take.
Check your audio on a 10-second test clip — bad audio ruins more demo videos than
bad features do.

---

## 10. Commands

```bash
npm run dev          # dev server
npm run verify       # typecheck + lint + build — run this before you push
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run lint:fix     # eslint --fix

npm run db:up        # start local Postgres (port 5442)
npm run db:down      # stop it
npm run db:reset     # wipe and restart
npm run db:push      # apply schema.ts to the database
npm run db:studio    # data browser
npm run db:seed      # load sample rows

npm run env:pull     # pull env vars from Vercel into .env.local
npm run deploy       # deploy to production

npx shadcn@latest add <component>    # add a UI component
```

---

## 11. When you are stuck

1. `/api/health` — is the DB up?
2. Is the failing component a client component importing something server-only?
3. `npm run typecheck` — the error is usually more precise than the browser's.
4. `npm run db:studio` — is the data actually what you think it is?
5. Still stuck after 10 minutes? **Ask the team.** Do not burn 40 minutes alone.
   In a 4-hour hackathon, 10 minutes is 4% of your budget.
