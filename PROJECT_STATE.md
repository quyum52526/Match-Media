# MatchMedia — Project State

This document describes the current state of the codebase, verified against source at commit `1849120` (branch `feature/recommended-carousel-ui`). It does not repeat anything already covered in `TECH_STACK.md` (stack, folder layout, env vars). Everything below is derived from reading the code. Where something could not be confirmed from code alone, it is marked as an open question rather than guessed.

---

## 1. Data Model

Source: `prisma/schema.prisma` (single schema file, 25 models, 23 enums).

### Models

| Model | Represents | Key fields | Relations |
|---|---|---|---|
| `User` | An account (any role: candidate, guardian, media agency, verification agent, or admin). | `role`, `accountCategory`, `email` (unique), `passwordHash`, `mobile` (unique), `isMobileVerified`, `isPro`, `proExpiresAt`, agency fields (`agencyName`, `contactPerson`, `agencyDistrict`, `agentAvatarKey`, `agencyLogo`, `tradeLicenseUrl`, `agencyVerificationStatus`), NID/selfie verification fields (`nidFrontKey`, `nidBackKey`, `nidVerificationStatus`, `nidReviewNote`, `selfieKey`, `selfieVerificationStatus`, `selfieReviewNote`), `createdAt` | 1:1 `profile`; 1:many `referredProfiles` (as MEDIA referrer), `photoRequestsMade/Received`, `interestsSent/Received`, `wards`, `agentServiceRequests/requestedServiceRequests`, `assignmentsCreated/Received`, `profileViews`, `orders`, `subscriptions`, `couponRedemptions`, `dailyUsage`, `reportsMade/Received`, `conversationsA/B`, `messagesSent`, `mobileOtps`, `notifications`, `postedJobs`, `jobApplications` |
| `Profile` | The matrimonial profile itself — one per candidate (self-registered or agency-managed). | `userId` (nullable+unique, null for agency-managed subjects with no login), `fullName`, `gender`, `dateOfBirth`, `district`, `upazila`, `profession`, `education`, `maritalStatus`, `bio`, `height`, `weight`, `childrenStatus`, `familyDetails`, `managedByAgency`, `isVerified`, `nameHidden`, `completionScore` (default 10), `referredById`, `createdAt` | `user` (optional 1:1), `referredBy` (User, MEDIA referrer), `images`, `viewLogs`, `serviceRequests`, `verificationAssignment` (1:1). Indexes: `[referredById]`, `[district, upazila]`, `[gender, dateOfBirth]`, `[gender, district]` |
| `ProfileImage` | One uploaded photo (original + blurred derivative) belonging to a profile. | `profileId`, `privacy` (BLURRED/PUBLIC), `originalKey`, `blurredKey`, `isPrimary`, `sortOrder`, `moderationStatus`, `reviewedAt`, `reviewedById`, `rejectionReason`, `createdAt` | belongs to `Profile`. Indexes: `[profileId]`, `[moderationStatus]` |
| `PhotoAccessRequest` | A viewer's request to see an owner's blurred photo unblurred. | `viewerId`, `ownerId`, `status` (PENDING/APPROVED/DENIED/REVOKED), `requestedAt`, `respondedAt` | `viewer`/`owner` (User). Unique `[viewerId, ownerId]`; index `[ownerId, status]` |
| `Interest` | One member expressing romantic/matrimonial interest in another. | `senderId`, `receiverId`, `status` (SENT/ACCEPTED/DECLINED), `note` (≤200 chars, enforced in server action), `createdAt` | `sender`/`receiver` (User). Unique `[senderId, receiverId]`; index `[receiverId, status]` |
| `WardDetails` | Free-form preference data a GUARDIAN records for a ward they manage. | `guardianId`, `targetMetrics` (Json), `createdAt` | `guardian` (User). Index `[guardianId]` |
| `ServiceRequest` | A request for an AGENT's paid service against a target profile, with a fee split. | `agentId`, `requesterId`, `targetProfileId`, `status` (PENDING/IN_PROGRESS/VERIFIED), `agentShare`, `adminShare`, `createdAt` | `agent`/`requester` (User), `targetProfile` (Profile). Indexes `[agentId, status]`, `[requesterId]` |
| `VerificationAssignment` | An admin-initiated physical identity-verification job assigned to one AGENT for one profile. | `assignedById`, `agentId`, `profileId` (unique — one active assignment per profile), `status` (PENDING→IN_PROGRESS→SUBMITTED→VERIFIED/CANCELLED), `agentNote`, `totalFee`/`agentShare`/`platformFee` (poisha, default ৳2,500/৳2,000/৳500), `assignedAt`, `startedAt`, `submittedAt`, `completedAt`, `createdAt` | `assignedBy`/`agent` (User), `profile` (Profile, 1:1). Indexes `[agentId, status]`, `[assignedById]` |
| `JobPost` | An open verification-job listing an AGENT (or requester) can bid on. | `title`, `description`, `targetDistrict`, `budgetAmount` (poisha), `status` (OPEN/ASSIGNED/CLOSED), `postedById`, `createdAt`, `updatedAt` | `postedBy` (User), `applications` (JobApplication[]). Indexes `[status, targetDistrict]`, `[postedById]` |
| `JobApplication` | An AGENT's bid on a `JobPost`. | `jobPostId`, `agentId`, `bidAmount`, `platformFee` (20% of bid), `agentShare`, `estimatedDeliveryDays`, `note`, `status` (PENDING/ACCEPTED/REJECTED), `createdAt` | `jobPost` (JobPost), `agent` (User). Unique `[jobPostId, agentId]`; index `[agentId]` |
| `AppSettings` | Single-row platform config. | `visibilityFloorPercent` (default 30), `updatedAt` | none |
| `ProfileViewLog` | One record of a viewer opening a profile on a given day (drives the daily view cap and "Who Viewed Me"). | `viewerId`, `viewedProfileId`, `date` (date-only), `createdAt` | `viewer` (User), `viewedProfile` (Profile). Unique `[viewerId, viewedProfileId, date]`; index `[viewedProfileId, date]` |
| `Plan` | A purchasable Pro subscription plan (DB-driven catalog, no hardcoded prices at the DB layer). | `code` (unique, e.g. `PRO_3M`), `name`, `durationDays`, `priceAmount` (poisha), `currency`, `isActive`, `sortOrder`, `createdAt` | `orders` (Order[]) |
| `Coupon` | A discount/promo code, optionally auto-applied at a lifecycle trigger. | `code` (unique), `description`, `discountType` (PERCENT/FIXED), `discountValue`, `trigger` (NONE/SIGNUP/RENEWAL), `appliesToPlan`, `grantsPlanCode`, `maxRedemptions`, `redeemedCount`, `perUserLimit` (default 1), `validFrom`/`validUntil`, `isActive`, `createdAt` | `redemptions` (CouponRedemption[]), `orders` (Order[]) |
| `CouponRedemption` | One user's use of one coupon on one order. | `couponId`, `userId`, `orderId` (unique), `createdAt` | `coupon`, `user`, `order`. Unique `[couponId, userId]`; index `[userId]` |
| `Order` | A billing order/invoice for a plan purchase (paid or promo-granted). | `invoiceNo` (unique), `userId`, `planId`/`planCode`/`planName`/`durationDays` (price snapshot), `baseAmount`, `discountAmount`, `finalAmount`, `currency`, `couponId`/`couponCode`, `status` (PENDING/PAID/FAILED/CANCELLED/EXPIRED/REFUNDED), `gateway`, `paidAt`, `createdAt` | `user`, `plan` (optional), `coupon` (optional), `payments` (Payment[]), `subscription` (1:1), `redemption` (1:1). Index `[userId, status]` |
| `Payment` | One gateway payment attempt/callback for an order. | `orderId`, `gateway`, `gatewayTxnId`, `status` (INITIATED/SUCCESS/FAILED/CANCELLED), `amount`, `rawPayload` (Json), `createdAt` | `order`. Index `[orderId]` |
| `Subscription` | The Pro-membership period resulting from a paid/granted order. | `userId`, `orderId` (unique), `planCode`, `startsAt`, `endsAt`, `status` (ACTIVE/EXPIRED/CANCELLED), `createdAt` | `user`, `order`. Indexes `[userId, endsAt]`, `[status, endsAt]` (used by the expiry cron sweep) |
| `DailyUsage` | Per-user, per-day, per-action counter for free-tier caps. | `userId`, `date`, `action` (`UsageAction`: PROFILE_VIEW/PHOTO_REQUEST), `count` | `user`. Unique `[userId, date, action]`; index `[userId, date]` |
| `Report` | A user-filed report against another user (optionally against one specific photo), for the admin moderation queue. | `reporterId`, `reportedUserId`, `imageId` (optional), `reason` (`ReportReason`), `note`, `status` (OPEN/RESOLVED/DISMISSED), `resolvedById`, `resolvedAt`, `createdAt` | `reporter`/`reportedUser` (User). Indexes `[status, createdAt]`, `[reportedUserId]` |
| `Conversation` | A 1:1 messaging thread between two matched users, canonically ordered (`userAId < userBId`). | `userAId`, `userBId`, `createdAt`, `lastMessageAt` | `userA`/`userB` (User), `messages` (Message[]), `calls` (CallSession[]). Unique `[userAId, userBId]`; indexes `[userAId, lastMessageAt]`, `[userBId, lastMessageAt]` |
| `Message` | One chat message in a conversation. | `conversationId`, `senderId`, `body`, `type` (`MessageType`: TEXT/SYSTEM/CALL_EVENT), `readAt`, `createdAt` | `conversation`, `sender` (User). Index `[conversationId, createdAt]` |
| `MobileOtp` | One SMS one-time-password challenge for verifying a mobile number. | `userId`, `mobile`, `codeHash` (bcrypt), `expiresAt`, `attempts`, `consumedAt`, `lastSentAt`, `createdAt` | `user`. Index `[userId]` |
| `CallSession` | One WebRTC voice-call attempt within a conversation. | `conversationId`, `callerId` (audit only), `status` (`CallStatus`), `startedAt`, `endedAt`, `createdAt` | `conversation`. Index `[conversationId, createdAt]` |
| `Notification` | One in-app notification for a recipient. | `userId`, `type` (`NotificationType`), `actorId` (audit only), `link`, `readAt`, `createdAt` | `user`. Indexes `[userId, readAt]`, `[userId, createdAt]` |

### Enums

| Enum | Values |
|---|---|
| `Role` | GENERAL, GUARDIAN, MEDIA, AGENT, ADMIN |
| `AccountCategory` | SELF, PARENTS, MEDIA, AGENT |
| `ImagePrivacy` | BLURRED, PUBLIC |
| `ModerationStatus` | PENDING, APPROVED, REJECTED |
| `PhotoAccessStatus` | PENDING, APPROVED, DENIED, REVOKED |
| `InterestStatus` | SENT, ACCEPTED, DECLINED |
| `ServiceStatus` | PENDING, IN_PROGRESS, VERIFIED |
| `AssignmentStatus` | PENDING, IN_PROGRESS, SUBMITTED, VERIFIED, CANCELLED |
| `AgencyVerificationStatus` | UNVERIFIED, PENDING_APPROVAL, VERIFIED, REJECTED |
| `VerificationStatus` | UNVERIFIED, PENDING, APPROVED, REJECTED |
| `OrderStatus` | PENDING, PAID, FAILED, CANCELLED, EXPIRED, REFUNDED |
| `PaymentStatus` | INITIATED, SUCCESS, FAILED, CANCELLED |
| `SubscriptionStatus` | ACTIVE, EXPIRED, CANCELLED |
| `DiscountType` | PERCENT, FIXED |
| `CouponTrigger` | NONE, SIGNUP, RENEWAL |
| `JobStatus` | OPEN, ASSIGNED, CLOSED |
| `ApplicationStatus` | PENDING, ACCEPTED, REJECTED |
| `UsageAction` | PROFILE_VIEW, PHOTO_REQUEST |
| `ReportStatus` | OPEN, RESOLVED, DISMISSED |
| `ReportReason` | INAPPROPRIATE_PHOTO, FAKE_PROFILE, HARASSMENT, SPAM, OTHER |
| `MessageType` | TEXT, SYSTEM, CALL_EVENT |
| `NotificationType` | PHOTO_REQUEST, PHOTO_ACCESS_GRANTED, INTEREST_RECEIVED, INTEREST_ACCEPTED, NEW_MESSAGE, MISSED_CALL, PHOTO_APPROVED, PHOTO_REJECTED, VERIFIED_BADGE, REPORT_RESOLVED, NID_APPROVED, NID_REJECTED, SELFIE_APPROVED, SELFIE_REJECTED |
| `CallStatus` | RINGING, ACTIVE, ENDED, MISSED, DECLINED, CANCELLED |

---

## 2. Routes

`middleware.ts` only runs `next-intl`'s locale middleware (locale detection/rewriting) and does **no authentication or role checks**. Every access rule below is therefore enforced by the individual page/route itself, via `lib/session.ts` helpers (`getViewerId`, `requireViewerId`, `requireAdmin`, `assertAdmin`) reading fresh from the DB.

### Pages (`app/[locale]/`)

| Route | What the user does there | Access |
|---|---|---|
| `/` | Public marketing homepage: hero, premium/new/verified profile showcases, map, how-it-works, influencer testimonial. | Public |
| `/about` | Static About page. | Public |
| `/blog` | Static blog list, post opens in a modal. | Public |
| `/contact` | Static contact info. | Public |
| `/events` | Static list of upcoming events. | Public |
| `/terms` | Terms & Conditions. | Public |
| `/user-guide` | Self-contained user guide (EN/BN toggle). | Public |
| `/login` | Login form. | Public |
| `/register` | Registration form. | Public |
| `/onboarding` | Multi-step wizard: choose account category (SELF/PARENTS/MEDIA/AGENT) and complete role-specific setup. | **No auth check found** — neither the page nor `OnboardingWizard` calls `auth()`/`getViewerId()`/`redirect()`. See Known Issues. |
| `/dashboard` | Signed-in home: stats, profile completion, recent viewers, Pro status, posted jobs, agent applications. | Logged-in; redirects to `/onboarding` if `accountCategory` is unset (non-admin) |
| `/browse` | Search/filter profiles; Recommended-for-You carousel; main profile grid. | Logged-in |
| `/profiles/[id]` | View another member's full profile (or a paywall screen if the daily view cap is hit). | Logged-in |
| `/profile/edit` | Self-service editor: candidate form + photos, or AGENT/MEDIA/GUARDIAN dashboard (own or a specific client/ward via `?clientId=`). | Logged-in; ownership enforced at data layer for client/ward edits |
| `/profile/verify` | Verification Center: mobile/NID/selfie/agency status. | Logged-in |
| `/verify-mobile` | Mobile OTP entry form. | Logged-in; redirects home if already verified |
| `/requests` | Sent/received photo-access request inbox. | Logged-in |
| `/interests` | Received interests inbox. | Logged-in |
| `/viewers` | "Who viewed me" list. | Logged-in |
| `/messages` | Conversation list. | Logged-in |
| `/messages/[conversationId]` | One message thread. | Logged-in; 404s if viewer isn't a participant |
| `/notifications` | Notification list, marks read on open. | Logged-in |
| `/jobs` | Verification job board (browse/bid on open jobs). | Role: AGENT or ADMIN (redirects others to `/dashboard`) |
| `/pro` | Plan cards + current Pro status. | Logged-in |
| `/pro/checkout/[orderId]` | Order/invoice summary before payment. | Logged-in; 404s if order isn't the viewer's |
| `/pro/pay/[orderId]` | Mock/hosted payment page for an order. | Logged-in; 404s if order isn't the viewer's |
| `/pro/success` | Post-payment "Welcome to Pro" page. | Logged-in |
| `/subscription` | Starts a plan purchase (creates order, redirects to gateway). | Logged-in |
| `/admin` (+ layout) | Admin overview dashboard (pending photos / open reports / unverified counts). | ADMIN only — `requireAdmin()` in `app/[locale]/admin/layout.tsx`, covers all nested `/admin/*` pages |
| `/admin/photos` | Photo moderation queue (approve/reject). | ADMIN only |
| `/admin/reports` | Open user-reports queue. | ADMIN only |
| `/admin/users` | User list/management. | ADMIN only |
| `/admin/verification` | Profile-completeness verification list (manual Verified-badge toggle). | ADMIN only |
| `/admin/verifications` | NID/selfie/agency document review hub. Distinct feature from `/admin/verification` despite the near-identical name — **not linked from any admin nav**, reachable only by typing the URL. Has its own redundant `assertAdmin()` check in addition to the layout's. | ADMIN only |

### API route handlers (`app/api/`)

| Route | What happens | Access |
|---|---|---|
| `/api/auth/[...nextauth]` (GET/POST) | Auth.js sign-in/callback/session/CSRF handler. | Public entry point (Auth.js governs each sub-action) |
| `/api/payments/[gateway]/ipn` (POST) | Server-to-server payment gateway IPN: verifies payload via `gw.verifyIpn()`, idempotently activates the order only on verified success. | No session check — trust boundary is gateway payload verification |
| `/api/payments/sslcommerz/success` (POST) | Browser-redirect success callback: re-validates via `verifyIpn`, activates order, redirects to `/pro/success` or back with `status=failed`. | No session check — same gateway-verification trust boundary |
| `/api/payments/sslcommerz/abort` (POST) | Browser-redirect fail/cancel callback: no activation, redirects back with `status=failed`. | No session check, no gateway verification needed (nothing is activated) |
| `/api/cron/expire` (GET/POST) | Runs the daily Pro-subscription expiry sweep. | Secret-token gated: requires `Authorization: Bearer $CRON_SECRET` or `?key=`; refuses to run if `CRON_SECRET` is unset |

---

## 3. Feature Status

Verified by reading each feature's UI, server action, and data path — not by filenames alone.

| Feature | Status | Evidence |
|---|---|---|
| Registration per role (SELF/GUARDIAN/MEDIA/AGENT) | **Working** | `components/auth/RegisterForm.tsx` → `lib/actions/auth.ts::register()` (creates `User`+`Profile`, auto-signs-in) → `components/onboarding/OnboardingWizard.tsx` + `lib/actions/onboarding.ts` (category-specific steps, real Prisma writes) |
| Mobile OTP verification | **Working** | `lib/actions/otp.ts` (bcrypt-hashed code, 5-min TTL, attempt cap, resend cooldown) + `lib/sms/index.ts` (Mock/SSL Wireless provider switch via `SMS_PROVIDER`) + `app/[locale]/verify-mobile/page.tsx` |
| Browse & filters | **Working** | `app/[locale]/browse/page.tsx` → `lib/data/profiles.ts::getBrowseProfiles` (real Prisma `where` from all filter fields) + `components/profile/FilterBar.tsx` (pushes real querystring) |
| Profile photo upload + blur | **Working** | `lib/storage/images.ts` (real `sharp` pixel blur, not CSS) + `lib/actions/photos.ts::uploadProfilePhoto` (writes `ProfileImage`, `PENDING` moderation) + `components/profile/PhotoManager.tsx` |
| Photo-access requests | **Working** | `lib/actions/funnel.ts::requestPhotoAccess`/`respondToPhotoRequest` (real Prisma writes, daily-cap gated, notifies) + `app/[locale]/requests/page.tsx` |
| Interest send/accept | **Working** | `lib/actions/funnel.ts::sendInterest`/`respondToInterest` + `app/[locale]/interests/page.tsx` → `components/interests/InterestInbox.tsx` (calls the real action on Accept/Decline) |
| Messaging | **Working** | `lib/actions/messages.ts::sendMessage` (re-checks mobile-verified + mutual-match server-side) + `app/[locale]/messages/*` + `components/messages/*` |
| Voice calling (WebRTC) | **Working** | `lib/actions/calls.ts` (real `CallSession` writes, server-side re-gate) + `components/calls/CallProvider.tsx` (full `RTCPeerConnection` offer/answer/ICE over Supabase Realtime broadcast, mic-fallback). Needs `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` configured or the UI self-gates off |
| Notifications | **Working** | `lib/notifications/dispatch.ts::notify()` (single writer, called from funnel/messages/calls/admin actions) + `app/[locale]/notifications/page.tsx` |
| Verification agent job board | **Working** | `app/[locale]/jobs/page.tsx` → `lib/data/jobs.ts::getJobBoard` + `lib/actions/jobs.ts` (`applyToJob`/`postJob`/`reviewApplication`, real `JobPost`/`JobApplication` writes with fee-split math) |
| Admin moderation (photos, reports) | **Working** | `lib/actions/admin.ts::approvePhoto`/`rejectPhoto`/`resolveReport` + `app/[locale]/admin/photos`, `/admin/reports` |
| Admin verification review (NID/selfie/agency) | **Working**, with one adjacent gap | `lib/actions/admin.ts::approveNid`/`rejectNid`/`approveSelfie`/`rejectSelfie`/`approveAgency`/`rejectAgency` + `app/[locale]/admin/verifications/page.tsx`. **Gap:** no code path creates a `VerificationAssignment` row — `lib/actions/agentAssignments.ts` (agent-side start/submit) exists and is wired, but no `verificationAssignment.create()` call exists anywhere in `lib/actions/*` or `components/admin/*` (confirmed by repo-wide grep). There is no admin UI to assign a specific agent to a specific profile for physical verification. |
| Pro checkout (SSLCommerz) | **Working** | `lib/billing/gateways/sslcommerz.ts` (real hosted-checkout session + IPN re-validation against SSLCommerz's own API) + `app/api/payments/[gateway]/ipn/route.ts` (never trusts the client redirect, only a verified IPN) |
| Subscription expiry cron | **Working** | `app/api/cron/expire/route.ts` (secret-gated) → `lib/billing/expiry.ts::runExpirySweep()` (real `updateMany` on expired subscriptions/users); scheduled daily in `vercel.json` |
| Recommended-for-You carousel | **Working** | `lib/data/recommend.ts::getRecommendedProfiles` (two-pass real Prisma query + DB fallback, no mock data) rendered by `components/profile/RecommendedProfiles.tsx` on `/browse` |
| Matching score | **Working** | `lib/matching/score.ts::scoreCandidate` (pure weighted function) + `lib/matching/weights.ts::MATCH_WEIGHTS`, called against real Prisma-fetched candidates in `lib/data/recommend.ts` |

---

## 4. Paid Gating Audit

### The core mechanism

`FREE_DAILY_LIMIT = 3` — `lib/constants/plans.ts:11`. This is the **only** hardcoded numeric cap in the codebase.

`lib/billing/usage.ts`:
- `checkDailyLimit(user, action, now)` — if `isProActive(user)` (`lib/billing/pricing.ts`, reads `user.isPro`/`user.proExpiresAt`, no role special-casing anywhere) → `{allowed:true, unlimited:true}`. Otherwise counts today's `DailyUsage` row against `FREE_DAILY_LIMIT`.
- `incrementDailyUsage` — upserts +1 on today's row.
- `assertWithinDailyLimit` — throws if capped, but **is never called anywhere in the codebase**. Dead code; real call sites branch on `checkDailyLimit(...).allowed` instead.

`UsageAction` has two enum values, but only one is actually used:
- `PHOTO_REQUEST` runs through the generic `DailyUsage` engine above.
- `PROFILE_VIEW` is **never referenced** outside `schema.prisma` — it is vestigial. Profile-view capping is instead a second, independently-implemented mechanism against the separate `ProfileViewLog` model, duplicated in `lib/data/profiles.ts::getProfileViewAccess` and `lib/data/billing.ts::getProfileViewQuota` — both count `ProfileViewLog` rows and compare to the same `FREE_DAILY_LIMIT`, but as two separate code paths that could drift.

### Every enforcement point found

| Gate | File | Limit | On hit | Active? |
|---|---|---|---|---|
| Photo-access request | `lib/actions/funnel.ts::requestPhotoAccess` (line ~72) | 3 new requests/day (re-requesting an existing target is free) | Returns `limitReached:true`; button disabled client-side by `PhotoQuotaContext` (`components/billing/PhotoQuota.tsx`) before the server round-trip; no hard page block | Active |
| Profile view | `lib/data/profiles.ts::getProfileViewAccess`, called from `app/[locale]/profiles/[id]/page.tsx` before the page even renders the profile | 3 distinct profiles/day (re-opening one already viewed today is free) | Full page replaced by a lock-icon "Go Pro" paywall screen | Active |
| "Who viewed me" reveal | `lib/data/viewers.ts::getProfileViewers` | Not numeric — a 24h reveal delay (`REVEAL_DELAY_MS`) for free **male/other** users only; free **female** users and all Pro users see instantly (explicit, documented design choice, not a bug) | Viewer identity withheld (`person: null`) until 24h after their first view | Active |
| Interest send | `lib/actions/funnel.ts::sendInterest` | None | N/A | **Not gated** — unlimited for everyone |
| Messaging | `lib/actions/messages.ts::sendMessage` | None (only `isMobileVerified` + mutual-match gates) | `NOT_VERIFIED` / `NOT_MATCHED` errors | **Not gated** by volume, free or Pro |
| Voice call | `lib/actions/calls.ts::startCall` | None (same two non-quota gates as messaging) | Same as above | **Not gated** by volume |
| `AppSettings.visibilityFloorPercent` | `prisma/schema.prisma`, seeded in `prisma/seed.ts` | Field exists (default 30) but is **never read anywhere in application code** | N/A | Dead column, not a real gate |

### If a brand-new free user signed up today

**As the code actually runs, they hit no limits at all**, because of a signup promo (see below) that makes every new registration Pro for 90 days. Stripping that promo out and tracing the underlying free-tier logic only:

1. **Photo-access requests** cap on the 4th distinct new request in a UTC day (`remaining` goes 3→2→1→0; the button disables before the 4th server call).
2. **Profile views** independently cap on the 4th distinct profile opened in a UTC day (full-page paywall).
3. Interest, messaging, and voice calling are never capped for anyone, Pro or free.

Whichever of the two 3/day caps the user's click order trips first is "the first limit hit" — both trip on the 4th action, never earlier.

### The promo that currently disables all of the above

`lib/constants/plans.ts` defines `WELCOME3MO`: a `SIGNUP`-triggered coupon, 100% off `PRO_3M`, `perUserLimit: 1`, seeded via `prisma/seedCatalog.ts`. `lib/actions/auth.ts::register()` calls `grantSignupSubscription(user.id)` (`lib/billing/orders.ts:178`) unconditionally right after every new `User` row is created (wrapped in try/catch so a grant failure never blocks signup). Because the resulting order's `finalAmount` is 0, `activateOrder()` runs immediately with no payment gateway involved, setting `isPro = true` and `proExpiresAt = now + 90 days`.

**Effect: every brand-new registration is functionally Pro for 90 days from the moment they finish signing up**, before ever reaching onboarding. This is a deliberate, documented product decision in the code (comment: "Signup gift — 3 months Pro free"), not a leaked bug — but it means the freemium caps described above are effectively inactive for any account less than 90 days old. `perUserLimit: 1` stops the same account from re-claiming it, but does not stop registering a new account/email for another 90 days.

No other bypass flag was found: `ADMIN` role does not automatically satisfy `isProActive` (it only reads `isPro`/`proExpiresAt`, no role check inside it), `SSLCOMMERZ_SANDBOX`/`PAYMENT_GATEWAY=mock` only affect paid-checkout simulation and don't touch quota logic, and there is no `FREE_FOR_ALL`/global kill-switch anywhere in the repo.

---

## 5. Matching Engine

Three files: `lib/matching/weights.ts` (config), `lib/matching/score.ts` (pure scoring function), `lib/data/recommend.ts` (retrieval + orchestration, powers the Recommended-for-You carousel on `/browse`).

**Inputs** (`MatchPreference`): the viewer's own profile (`district`, `education`, `profession`, `maritalStatus`, age) — each field individually overridden by an active search filter if the viewer has one set (`resolvePreferredAge`, hybrid preference vector in `getRecommendedProfiles`).

**Scoring** (`scoreCandidate` in `score.ts`): additive point sum, one comparison per attribute:
- Same district → +5
- Candidate's age within ±3 years of preferred age (`AGE_MATCH_TOLERANCE`) → +3
- Same education → +2
- Same profession → +2
- Same marital status → +1

Max attainable score = 13 (`MAX_MATCH_SCORE`, summed from the weights). `toMatchPercent(score)` normalizes to a 0–100 "match %" for the UI badge; badges only render at ≥40% (`MATCH_BADGE_MIN_PERCENT`).

**Weights** (`lib/matching/weights.ts`): `district: 5, ageRange: 3, education: 2, profession: 2, maritalStatus: 1`. Also defines `AGE_GATE_WINDOW = 10` (the hard ±10-year DB scan window, wider than the ±3-year scoring tolerance so near-misses still surface) and `RECOMMENDED_LIMIT = 20`.

**Retrieval** (`lib/data/recommend.ts::getRecommendedProfiles`): two-pass, index-backed for cost control as the table grows.
1. Cheap scan: opposite-gender (or filter-specified gender) + age within `AGE_GATE_WINDOW`, using the `[gender, dateOfBirth]` index, selecting only the ~7 columns scoring needs.
2. Score all candidates in-memory, drop zero-score rows, sort by score → verified-first → newest, take top 20.
3. Hydrate only those 20 through the shared profile-card pipeline (signed image URLs, privacy fields) — the expensive part never touches the full candidate set.

If scoring yields nothing (sparse profile, narrow filters, or a viewer with no profile at all — MEDIA/ADMIN/GUARDIAN accounts) it falls back to the most-complete recent candidates (by `completionScore`, then `createdAt`) with `matchScore: 0`, so the carousel is never empty.

**Display**: `components/profile/RecommendedProfiles.tsx`, rendered inside `app/[locale]/browse/page.tsx`, above the main grid, as a single horizontally-scrolling row (`components/profile/HorizontalScroller.tsx`) reusing the same `ProfileCard` component as the main grid.

---

## 6. Recent Additions

Not yet documented in `TECH_STACK.md`.

- **`components/DolnaHero.tsx`** — client component, a decorative animated hero visual: a damped-harmonic-oscillator "swinging" image pair (background + foreground swing layers), driven by `requestAnimationFrame`, with hover-to-swing (desktop) or tap/intersection-triggered swing (touch), reduced-motion and tab-visibility handling. Purely presentational (`aria-hidden`), no data. Used inside `components/home/HomeHero.tsx`.
- **`components/home/FeaturedInfluencer.tsx`** — server component: a full-width testimonial/social-proof band placed just above the homepage footer, styled as a single glassmorphism banner (portrait + quote) over a Garnet/Champagne gradient mesh. Content (`quote`, `name`, `designation`) comes from the `Home.influencer` i18n namespace; the portrait image path is hardcoded (`/giyanna-rose.png`) as decorative brand content. Rendered in `app/[locale]/page.tsx`.
- **`components/profile/RecommendedProfiles.tsx`** — the Recommended-for-You carousel UI described in §5. Renders a distinct gray-panel section with its own `PhotoQuotaProvider`, an empty state when there are no recommendations, and reuses `ProfileCard`.
- **`components/profile/HorizontalScroller.tsx`** — generic client-side scroll-row helper used by `RecommendedProfiles` (and available for reuse elsewhere): adds mouse-wheel-to-horizontal, click-and-drag, and optional Prev/Next arrow-button paging to an `overflow-x-auto` row, since browsers don't natively support wheel/drag scrolling on such rows. Drag-vs-click is disambiguated so a drag never fires a card's link/button.
- **`components/ui/PasswordInput.tsx`** — shared password `<input>` with a show/hide toggle (eye icon), used by `LoginForm` and `RegisterForm`. Replaces plain `<input type="password">` fields with unlabeled toggle affordance (`aria-pressed`, `aria-label` from the `Auth` i18n namespace).
- **Migration `20260713045404_add_matchmaking_indexes`** — adds two Postgres indexes to `Profile`: `(gender, dateOfBirth)` and `(gender, district)`. These back the recommendation engine's candidate-gate scan (§5, pass 1) and general gender-scoped browse queries, keeping recommendation latency flat as the profile table grows. No column or data changes.

---

## 7. Dead Code

Verified by grepping every reference to each symbol/import path across the repo (not just filename search).

| File | Status |
|---|---|
| `components/home/CuratedProfiles.tsx` | Never imported anywhere outside itself. |
| `components/home/ProfileCarousel.tsx` | Never imported anywhere outside itself. |
| `components/home/ProfileShowcase.tsx` | Never imported anywhere outside itself. |
| `components/home/ProfileShowcaseCard.tsx` | Only referenced by `ProfileShowcase.tsx` (itself dead) — transitively dead. |
| `components/home/CountUpStat.tsx` | Never imported anywhere outside itself. |

These five appear to be leftovers from an earlier homepage build (a "showcase grid" section) superseded by the current `StackedFeatureSection` + `FeaturedInfluencer` homepage layout (`app/[locale]/page.tsx`, §6). All other components under `components/` (including every file under `home/` not listed above) are referenced from at least one other file.

`lib/billing/usage.ts::assertWithinDailyLimit` (§4) is a dead function within an otherwise-live file — exported but never called.

`prisma/schema.prisma`'s `UsageAction.PROFILE_VIEW` enum value and `AppSettings.visibilityFloorPercent` field (§4) are dead — defined in the schema but never read by application code.

---

## 8. Known Issues & TODOs

- **`/onboarding` has no auth check.** Neither `app/[locale]/onboarding/page.tsx` nor `components/onboarding/OnboardingWizard.tsx` calls `auth()`/`getViewerId()`/`redirect()`, and `middleware.ts` doesn't gate it either. The route sets up `accountCategory` for a signed-in user but nothing currently stops an anonymous visit to the page shell. Whether the underlying server actions it calls (`lib/actions/onboarding.ts`) independently re-check the session was not confirmed in this pass — worth checking before treating this as low-severity.
- **Duplicate 3/day cap logic.** The profile-view cap is implemented twice independently — `lib/data/profiles.ts::getProfileViewAccess` and `lib/data/billing.ts::getProfileViewQuota` — both reading `ProfileViewLog` and comparing to `FREE_DAILY_LIMIT`. They currently agree, but a future edit to one without the other would silently desync the "requests remaining" number shown in the UI from the number actually enforced.
- **Stale/misleading comments:**
  - `lib/actions/funnel.ts:31` — a top-of-file comment says the acting user is derived from "the hardcoded CURRENT_VIEWER_ID (TODO(auth): derive from session instead)". This is outdated: the code on the very next lines calls `getViewerId()` (a real session-derived lookup), not a hardcoded constant. No such constant exists in the file.
  - `components/profile/ProfileDetail.tsx:48-53` — a doc comment says "The funnel state is held in local React state so the page is a clickable demo... No backend / business logic is wired yet." This is also outdated: the component imports and calls real server actions (`requestPhotoAccessAction`, `sendInterestAction`, `startConversation`).
- **`VerificationAssignment` has no creation path** (§3, item "Admin verification review"). The agent-side workflow (`lib/actions/agentAssignments.ts::startAssignment`/`submitAssignment`) is fully wired, but no code anywhere calls `prisma.verificationAssignment.create(...)`. Either this is provisioned by a script not covered by this pass (e.g. a seed file), or the admin-side "assign an agent to a profile" UI/action genuinely does not exist yet.
- **`/admin/verifications` (plural) is orphaned** — the page and its `assertAdmin()` gate work, but no admin nav link points to it; it's reachable only by typing the URL directly. The nav only links to `/admin/verification` (singular, a different feature).
- **`WELCOME3MO` signup coupon neutralizes the freemium model for 90 days per account** (§4). Not a bug per se (the code is intentional and commented), but it means the "3/day" caps described in the Paid Gating Audit are not actually experienced by any user within 90 days of registering, as long as the coupon stays active and seeded.
- **Two SMS providers exist but only one is exercised without extra config** — `SMS_PROVIDER` defaults to `mock` (logs OTP codes to the server console); `sslwireless` requires `SSLSMS_API_TOKEN`/`SSLSMS_SID` to be set, which was not verified as configured in this environment.
- No other `TODO`/`FIXME`/`HACK`/`XXX` markers were found in `.ts`/`.tsx` source outside the two stale comments above (a repo-wide grep returned only these plus unrelated phone-number placeholder text like `01XXXXXXXXX`).

---

## 9. Open Questions

These could not be resolved from code alone and need a human answer:

1. **Is `WELCOME3MO` still meant to be active in production?** The code and seed data make every new signup Pro for 90 days. If this was meant as a time-boxed launch promo, someone needs to confirm whether it should still be seeded/active, and if not, deactivate or delete the `Coupon` row (`isActive: false`, or remove it from `COUPON_CATALOG` and re-seed).
2. **Is the missing `VerificationAssignment` creation path intentional (feature not yet built) or a regression?** If admins are meant to assign specific agents to specific profiles for physical verification (as the model and agent-side code imply), that admin action/UI needs to be built. If the `JobPost`/`JobApplication` open-bidding board is meant to fully replace it, the `VerificationAssignment` model and its agent-side code may be intentionally unused and could be candidates for removal — this needs a product decision either way.
3. **Should `/onboarding` be gated?** Confirm whether anonymous access to the onboarding page (without a signed-in session) is intended to be harmless (e.g. its actions independently reject unauthenticated callers) or is a real gap that needs a `requireViewerId()` check added to the page.
4. **Should `/admin/verifications` be linked from the admin nav, or retired in favor of `/admin/verification`?** Two admin routes with near-identical names covering different verification concepts is confusing; a decision on which is current/intended and whether to add a nav link or merge them would resolve this.
5. **Is `SSLSMS_API_TOKEN`/`SSLSMS_SID` configured anywhere (staging/production)?** Could not be verified from this repo checkout — determines whether real OTP SMS delivery has ever been exercised outside the mock provider.
6. **What is `AppSettings.visibilityFloorPercent` supposed to control?** It's seeded with a value (30) and documented by name, but nothing in the application reads it. Either it's a planned-but-unbuilt feature (e.g. throttling free-user visibility in browse/recommend results) or genuinely dead and safe to remove — needs a product/engineering decision.
