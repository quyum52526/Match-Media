# MatchMedia (matchmedia.com.bd)

Privacy-first, nationwide Bangladeshi matrimonial platform.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS 3 · Prisma ORM (PostgreSQL)

> This repository is currently **foundation only** — no UI pages or business
> logic yet. It contains the project configuration, the brand design tokens,
> the complete Prisma data model, and the `AppSettings` seed.

## User roles & core funnel

- **Roles:** `GENERAL`, `GUARDIAN`, `MEDIA`, `AGENT`, `ADMIN`
- **Funnel:** browse (blurred photos) → photo-access request → interest →
  accept → contact-reveal (paywall)

## Brand design tokens

| Token         | Value     | Usage              |
| ------------- | --------- | ------------------ |
| `charcoal`    | `#0F172A` | Primary text / dark|
| `trustGreen`  | `#047857` | Primary brand      |
| `verifyGreen` | `#10B981` | Verified / success |
| `gold`        | `#B45309` | Accent / premium   |
| `ivory`       | `#F7F4ED` | Background         |

**Fonts** (wired via `next/font` in `app/layout.tsx`):

- `Inter` → `font-sans` (Latin / numerals), CSS var `--font-inter`
- `Hind Siliguri` → `font-bengali` (Bengali), CSS var `--font-hind`

## Prerequisites

- **Node.js 18.18+** (20 LTS recommended) and npm
- A running **PostgreSQL** instance

## Setup & migration commands

```bash
# 1. Install dependencies (postinstall runs `prisma generate`)
npm install

# 2. Configure the database connection
#    Copy the example env and edit DATABASE_URL to point at your Postgres
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env

# 3. Create the database schema + initial migration
npx prisma migrate dev --name init

# 4. Seed the single AppSettings row (visibilityFloorPercent=30)
#    plus the billing catalog (plans + promo coupons)
npx prisma db seed

# 5. Start the dev server
npm run dev
```

### Handy npm scripts

| Script              | Action                                  |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Start Next.js dev server                |
| `npm run build`     | `prisma generate` + `next build`        |
| `npm run db:migrate`| `prisma migrate dev`                    |
| `npm run db:deploy` | `prisma migrate deploy` (prod)          |
| `npm run db:seed`   | Seed `AppSettings`                      |
| `npm run db:studio` | Open Prisma Studio                      |
| `npm run db:generate`| Regenerate Prisma Client               |

## Project layout

```
.
├── app/
│   ├── globals.css        # Tailwind directives
│   └── layout.tsx         # Root shell + next/font wiring (no UI pages yet)
├── lib/
│   └── prisma.ts          # PrismaClient singleton
├── prisma/
│   ├── schema.prisma      # Full data model + enums
│   └── seed.ts            # AppSettings seed
├── tailwind.config.ts     # Brand tokens + font families
├── postcss.config.mjs
├── next.config.mjs
├── tsconfig.json
└── .env.example
```
