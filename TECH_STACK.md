# MatchMedia — Technical Architecture & Tech Stack

## Project Overview

MatchMedia is a privacy-first, nationwide matrimonial (matchmaking) platform for Bangladesh. It connects four kinds of members — self-registered candidates, parents managing a profile on a son's or daughter's behalf, MEDIA agencies managing multiple client profiles, and field verification Agents — through a single, consent-driven funnel: **browse → send Interest → mutual match → in-app messaging & voice calling**.

The platform is built around three product principles that shape most of the architecture decisions below:

- **Privacy by default.** Phone numbers and email addresses are never displayed to other members; profile photos start blurred and are only revealed once the owner grants access. All contact happens through the platform's own messaging and calling features, not by exchanging personal numbers.
- **Verification as trust.** A network of registered Verification Agents confirms member identity (NID), locality, and other details, which is what earns a profile its "Verified" / "Premium Verified" badge.
- **Freemium with a Pro tier.** Free accounts get daily caps on profile views/photo requests; a paid Pro subscription (via SSLCommerz, Bangladesh's leading payment gateway) lifts those caps and unlocks additional features.

## Core Tech Stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) | Server Components let viewer-scoped, privacy-sensitive data (photo access, match status, masked contact info) be resolved and filtered entirely on the server before anything reaches the client bundle — critical for a platform whose core promise is that raw contact data never leaks. The App Router's file-based routing also cleanly supports the `[locale]` segment needed for bilingual (Bengali/English) delivery. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | End-to-end type safety across a domain with many interlocking states (interest status, photo-access status, moderation status, subscription status, call status, etc.) where a mismatched string literal is an easy, costly bug. Prisma's generated types and the UI-facing view-model types in `components/*/types.ts` are hand-kept in sync (see note below) so the compiler catches drift early. |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Utility classes plus a small set of semantic design tokens (`primary`, `secondary`, `accent`, `canvas`, `ink`, `hairline`, etc., mapped to CSS variables in `app/globals.css` and `tailwind.config.ts`) keep the Garnet/Ivory brand consistent across ~fifty components without a separate CSS-in-JS runtime cost. |
| **Database / ORM** | [Prisma](https://www.prisma.io/) + PostgreSQL | A single declarative schema (`prisma/schema.prisma`) is the source of truth for ~25 models and ~20 enums covering profiles, interests, billing, messaging, calls, notifications, and moderation. Prisma's generated client gives type-safe queries, and `prisma migrate` provides versioned, reviewable migrations — important given how often this schema evolves alongside the product. |
| **Auth** | [Auth.js (NextAuth v5 beta)](https://authjs.dev/) | Credentials-based session auth (`auth.ts`), integrated with the App Router's server-first data-fetching model so `auth()` can be awaited directly inside Server Components and Server Actions. |
| **i18n** | [next-intl](https://next-intl.dev/) | Full bilingual support (English / Bengali) via parallel message catalogs (`messages/en.json`, `messages/bn.json`) and locale-aware routing (`i18n/routing.ts`, `i18n/navigation.ts`), including Bengali-specific font pairings (Noto Serif Bengali / Hind Siliguri) alongside the Latin brand fonts (Fraunces / Plus Jakarta Sans). |
| **File storage** | [Supabase Storage](https://supabase.com/storage) | Private bucket for profile photos; the server signs short-lived URLs and serves either the original or a pre-generated blurred teaser depending on the viewer's access state — the unblurred original's storage key is never sent to a viewer who hasn't been granted access. |
| **Image processing** | [sharp](https://sharp.pixelplex.io/) | Generates the blurred teaser image server-side at upload time, so blurring is a real, un-reversible transformation rather than a CSS filter a client could strip. |
| **Realtime signaling** | [Supabase Realtime](https://supabase.com/realtime) | Broadcast channels carry WebRTC call-signaling (ringing, offer/answer, ICE candidates) for the in-app voice-calling feature; STUN is used by default with optional TURN relay configuration for restrictive mobile networks. |
| **Payments** | [SSLCommerz](https://www.sslcommerz.com/) | Bangladesh's dominant payment gateway, used for Pro subscription checkout with server-validated IPN (Instant Payment Notification) callbacks and idempotent activation. A "mock" gateway mode is available for local development without live credentials. |
| **SMS / OTP** | Provider abstraction (Mock / SSL Wireless) | Mobile-number verification (OTP) is behind a swappable provider interface (`lib/sms`) — a mock provider logs the code to the server console in development, and SSL Wireless sends real SMS in production. |
| **Password hashing** | [bcryptjs](https://www.npmjs.com/package/bcryptjs) | Standard adaptive hashing for user credentials and OTP codes at rest. |

## Project Structure

```
matchmedia/
├── app/                      # Next.js App Router
│   ├── [locale]/             # All user-facing routes, nested under the locale segment
│   │   ├── page.tsx          # Public homepage (hero, quick filters, showcase)
│   │   ├── browse/           # Profile search & filtering
│   │   ├── profiles/         # Profile detail view
│   │   ├── profile/          # Own-profile edit + photo management
│   │   ├── dashboard/        # Per-role dashboards (candidate/parent/media/agent)
│   │   ├── interests/        # Sent & received Interests
│   │   ├── requests/         # Photo-access requests
│   │   ├── messages/         # In-app 1:1 messaging (matched users only)
│   │   ├── notifications/    # Notification center
│   │   ├── jobs/             # Verification job board (for Agents)
│   │   ├── admin/            # Moderation, verification review, user management
│   │   ├── onboarding/       # Registration / role-based onboarding flows
│   │   ├── pro/              # Subscription upsell + checkout entry point
│   │   ├── verify-mobile/    # OTP verification flow
│   │   ├── terms/, about/, contact/, blog/, events/, user-guide/  # Static/marketing pages
│   │   └── layout.tsx        # Locale-scoped root layout (fonts, providers, Header)
│   └── api/                  # Route Handlers: auth callbacks, SSLCommerz IPN, cron jobs
│
├── components/                # React components, grouped by domain
│   ├── ui/                    # Design-system primitives (Button, Card, Modal, Badge, icons)
│   ├── layout/                # Header, nav dropdowns, mobile menu, locale switcher
│   ├── home/                  # Public homepage sections (Hero, Showcase, Footer)
│   ├── profile/                # Profile detail/edit, photo gating, view models (types.ts)
│   ├── privacy/                # PrivacyBlur, MaskedContact — shared privacy UI primitives
│   ├── messages/, calls/       # Messaging thread UI, WebRTC call overlay/provider
│   ├── billing/                # Pro-plan quota banners, subscription UI
│   ├── admin/, agent/, media/, guardian/, verification/  # Role-specific dashboards & tools
│   ├── onboarding/, auth/       # Registration steps, mobile-verify banner
│   ├── guide/, terms/          # User Guide accordion, Terms & Conditions page
│   └── jobs/                   # Verification job board UI
│
├── lib/                       # Server-side domain logic (framework-agnostic where possible)
│   ├── data/                   # Read-side query functions per domain (profiles, billing, dashboard, ...)
│   ├── actions/                # Server Actions — the mutation/write side (funnel, messages, billing, ...)
│   ├── billing/                # Plan/quota/subscription business rules
│   ├── notifications/          # Central notification dispatcher
│   ├── realtime/                # Supabase Realtime client for call signaling
│   ├── sms/                     # SMS provider abstraction (mock / SSL Wireless)
│   ├── storage/                 # Supabase Storage helpers (signed URLs, upload)
│   ├── privacy.ts               # Contact-masking utilities (maskPhone/maskEmail)
│   ├── prisma.ts                # Shared Prisma client singleton
│   ├── session.ts               # Viewer/session helpers
│   └── utils.ts                 # Misc shared utilities (cn, formatting, completion scoring)
│
├── prisma/
│   ├── schema.prisma            # Single source of truth: ~25 models, ~20 enums
│   ├── migrations/               # Versioned, timestamped SQL migrations
│   ├── seed.ts, seedCatalog.ts, seedTestUsers.ts   # Local dev seed data
│   └── promoteAdmin.ts           # One-off script to grant admin role
│
├── i18n/                        # next-intl routing/navigation/request config
├── messages/                    # en.json / bn.json translation catalogs
├── types/                       # Ambient type augmentation (e.g. next-auth.d.ts)
├── public/                      # Static assets (images, hero video, favicon)
├── auth.ts                       # Auth.js configuration
├── middleware.ts                  # Locale detection + route middleware
└── tailwind.config.ts, app/globals.css   # Design tokens (brand colors, fonts, radii, shadows)
```

**A note on the `lib/data` vs `lib/actions` split:** by convention in this codebase, `lib/data/*` holds read-only query functions (marked `import "server-only"`) that shape database rows into the view-model types consumed by components, while `lib/actions/*` holds the `"use server"` mutation functions invoked from client forms and buttons. This keeps the read path and write path easy to audit independently — especially important for privacy-sensitive reads (e.g. `getProfileForViewer` in `lib/data/profiles.ts`, which decides exactly what a given viewer is allowed to see).

## Environment Setup

Environment variables are managed via a `.env` file at the project root (see `.env.example` for the full annotated list, which is safe to commit since it contains no real secrets). Key variables include:

- `DATABASE_URL` — PostgreSQL connection string used by Prisma.
- `AUTH_SECRET` — session-signing secret for Auth.js.
- `CRON_SECRET` — shared secret authenticating the scheduled subscription-expiry job.
- `APP_URL` — absolute origin used to build payment-gateway callback URLs.
- `PAYMENT_GATEWAY`, `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWD`, `SSLCOMMERZ_SANDBOX` — payment gateway configuration (a `mock` gateway is available for local development).
- `SMS_PROVIDER`, `SSLSMS_API_TOKEN`, `SSLSMS_SID` — SMS/OTP provider configuration (`mock` requires no credentials and logs OTP codes to the server console).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public Supabase config for Realtime call signaling.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` — server-only Supabase Storage config for profile photos (the service-role key must never reach the browser).
- `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` (optional) — TURN relay for WebRTC calling on restrictive networks.

To get started locally: copy `.env.example` to `.env`, fill in a local PostgreSQL `DATABASE_URL`, then run `npm run db:migrate` followed by `npm run db:seed` before `npm run dev`.
