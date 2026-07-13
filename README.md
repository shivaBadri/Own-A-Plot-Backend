# Own A Plot — Website + Admin

A single Next.js 15 application. The public site (the approved Own A Plot design)
and the admin CMS live in the same codebase, share the same Prisma client and
middleware, and deploy as **one unit**.

- Public — `/`, `/ventures`, `/ventures/[slug]`, `/plots`, `/plots/[id]`, `/about`, `/contact`
- Admin — `/admin/*`, cookie-authenticated, guarded by middleware
- API — `/api/*`

---

## Deploying

This is one Next.js app. It goes to **Vercel as a single project**. There is no
separate backend to put on Render or Railway — the API routes, the admin, and the
public pages are all part of the same build and all import the same
`src/lib/db.ts`. Splitting them would mean building two applications.

### 1. Database (Neon)

Create a Neon Postgres database and copy the **pooled** connection string (the
host ends in `-pooler`).

```bash
# Apply the schema. Use the DIRECT (non-pooled) string for this command only —
# Neon's pooler cannot run DDL.
DATABASE_URL="<direct-url>" npx prisma migrate deploy

# Seed: admin account, site settings, and the three ventures.
DATABASE_URL="<direct-url>" npm run seed
```

The seed is idempotent — re-running it will not duplicate anything.

### 2. Cloudinary

Copy the cloud name, API key, and API secret from **Dashboard → Account Details**.

### 3. Vercel

Import the repo and set:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string |
| `AUTH_SECRET` | `openssl rand -base64 32`. **Set this.** There is a dev fallback in code; leaving it unset in production means sessions can be forged. |
| `CLOUDINARY_CLOUD_NAME` | |
| `CLOUDINARY_API_KEY` | |
| `CLOUDINARY_API_SECRET` | |
| `NEXT_PUBLIC_SITE_URL` | e.g. `https://www.ownaplot.com`, no trailing slash |

`package.json` runs `prisma generate` in both `postinstall` and `build`. This is
required — Vercel caches `node_modules`, and without it the Prisma client drifts
from the schema and the build fails with confusing type errors.

Sign in at `/admin/login` and change the seeded password immediately.

---

## Local

```bash
npm install
cp .env.example .env      # then fill it in
npx prisma migrate deploy
npm run seed
npm run dev
```

---

## How content flows

**Nothing on the public site is hard-coded.** Three sources feed it:

| Source | Drives |
| --- | --- |
| `Project` rows | Ventures — hero, story, gallery, amenities, the numbers table, location advantages, landscape rows, nearby distances, brochure, SEO |
| `CmsSection` rows | Homepage copy, about page, contact page, listing headers |
| `SiteSettings` (singleton) | Footer, contact details, social links, default SEO |

`src/lib/cms.ts` holds a typed default for every CMS block, taken **verbatim from
the approved design**. Public pages read through `getCms()`, which merges stored
content over those defaults. Consequence: an empty database still renders the
approved site exactly as designed, and the CMS only ever *overrides*. A blanked
field falls back rather than leaving a hole in a page.

`src/lib/content.ts` is the single seam between the `Project` table and the
`Venture` shape the approved components expect. All JSON parsing happens there,
once, defensively — a malformed `advantages` blob degrades to an empty section
instead of crashing a page.

---

## What changed from the delivered backend

**The delivered project did not build.** `npm run build` failed on
`src/app/api/cms/route.ts:40` — Prisma's `InputJsonValue` rejecting Zod's
`Record<string, unknown>`. Fixed.

**The schema was extended, additively.** The approved frontend renders ~14 fields
per venture that `Project` did not have (`tagline`, `region`, `totalAcres`,
`heroVideo`, `accent`, `gallery`, story, advantages, details, landscape, nearby,
brochure). Without them the public pages could not be database-driven at all. No
existing column was removed or renamed; every new column is optional or has a
default, so the migration is non-destructive.

**There were no migrations.** `prisma/migrations/` did not exist — nothing had
ever been migrated. There is now an init migration, executed and verified against
PostgreSQL 16.

**The enquiry form never submitted.** The approved `EnquiryForm` called
`setState("sent")` and posted nowhere; no enquiry could ever reach a database. It
now posts to `/api/enquiries`, with a honeypot, a per-IP rate limit, and per-field
error display. An **Email** field was added — `Enquiry.email` is non-null and the
business cannot follow up on a callback request without one. It uses the identical
`.input-luxury` treatment inside the same two-column grid, so the form's
proportions are unchanged. This is the only change to the approved markup.

**The ventures filters were decorative.** The approved build labelled them
`(visual — non-functional)`. They now drive real server-side queries through the
URL, so filtered listings stay linkable and back-button-correct.

**Media was half-built.** No list endpoint, no delete, no alt-text editing — and
uploads hard-rejected anything that was not an image, which made the brochure
download on every venture page unreachable, because no PDF could enter the system.
PDFs now upload as Cloudinary `raw`; `Media.kind` records which, so deletes pass
the right `resource_type` back. Deletes hit Cloudinary first, then the database:
the reverse order can orphan a paid-for asset whose `publicId` no longer exists
anywhere.

**Routes.** The approved site uses `/ventures`; the backend used `/projects`.
`/ventures` is now canonical, and `/projects/*` 308-redirects to it.

**Admin.** Rebuilt on the approved design tokens — same palette, same
Playfair/Inter, same square geometry and hairline rules, one density step tighter.
The sidebar is `bg-loam`, the exact surface the public navbar drops to on scroll.
It is also responsive; the original fixed 256px sidebar was not.

**Security.** Login is rate-limited and timing-equalised (a missing account and a
wrong password now take the same time, closing an email-enumeration oracle). The
admin layout re-checks that the session's admin still exists in the database —
middleware runs on the Edge and cannot reach Postgres, so a deleted admin's cookie
previously kept working for up to seven days. The post-login redirect only accepts
same-origin `/admin` paths.

---

## Verified

Run against this codebase, not asserted:

- `npm install` — clean
- `npx tsc --noEmit` — **0 errors**
- `npx eslint src --max-warnings=0` — **0 errors, 0 warnings**
- `next build` — **succeeds**, all 30 routes compile
- `prisma/migrations/.../migration.sql` — **executed against PostgreSQL 16**; all 7 tables, all indexes, all foreign keys created
- Every query shape the app runs — executed against that live database with real data
- Constraints — duplicate `slug` and duplicate `plotNumber`-within-venture both correctly rejected; deleting a venture cascades to its plots while **preserving** its enquiries with the foreign keys nulled, exactly as `DELETE /api/projects/[id]` documents

## Not verified — check these first

Sandbox network restrictions meant three things could not be exercised end to end.
They are compile-verified and schema-verified, not runtime-verified:

1. **Live Prisma queries against Neon.** The query shapes were verified against a
   real Postgres 16 via raw SQL, and the Prisma client typechecks against the
   schema — but Prisma's query engine binary could not be downloaded here, so no
   query ran *through Prisma*. Run `npm run seed`, then load `/` and
   `/admin/dashboard`.
2. **Cloudinary upload and delete.** Upload an image and a PDF in the admin, then
   delete them and confirm they disappear from the Cloudinary console.
3. **Google Fonts at build time.** `next/font/google` fetches Playfair and Inter
   during the build. Vercel reaches it; this sandbox could not.

The rate limiter (`src/lib/rate-limit.ts`) keeps its counter in process memory, so
on Vercel it is per-serverless-instance rather than global. It stops casual abuse
and bot spray, which is what it is for. If enquiry volume ever justifies it, swap
the `Map` for Upstash Redis — the call signature will not change.
