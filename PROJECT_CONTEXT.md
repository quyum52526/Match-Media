# MatchMedia — Architecture & Business-Logic Context

Bangladeshi matrimonial platform. Next.js 15 App Router (RSC + Server Actions), Prisma 6 + PostgreSQL (Supabase), Auth.js v5 (Credentials/JWT), Supabase Storage (private buckets, signed URLs) + Supabase Realtime (WebRTC signaling), next-intl (`bn` default unprefixed, `en` at `/en`), Tailwind. Money is **integer poisha** everywhere (1 BDT = 100 poisha). Deployed on Vercel; one cron (`vercel.json` → `/api/cron/expire` at 00:10 UTC).

## 0. Trust & Session Model

`auth.ts` — Credentials provider only (email + bcrypt `passwordHash`), JWT strategy, `token.id`/`session.user.id` threaded. **Role is deliberately NOT in the JWT.**

`lib/session.ts`:
- `getViewerId()` → `string | null`
- `requireViewerId(loginPath)` → redirects if signed out
- `getViewerRole()` — `react.cache`d, reads `User.role` from DB each request (promotion/demotion is immediate, no stale-token window)
- `requireAdmin(loginPath, homePath)` — DB re-check, redirects
- `assertAdmin()` — non-redirecting, returns adminId or `null`; the gate used by every action in `lib/actions/admin.ts`
- `getViewerIdOrGuest(loginPath)` → `{ viewerId: string|null, isGuest: boolean }`; redirects only when neither session nor guest cookie

`middleware.ts` owns **next-intl locale routing only** — no auth. Auth.js's Node deps (prisma/bcrypt) can't run on Edge, so every page guards itself in the RSC and every action re-checks server-side. Middleware's extra logic only repairs next-intl redirect origins (`x-forwarded-host` → correct origin; `APP_URL` is a *local-dev-only* fallback).

**Guest mode** (`lib/guest.ts`, `lib/actions/guest.ts`): cookie `mm_guest=1`, httpOnly, 24h. `enterGuestMode`/`exitGuestMode` (form actions, carry `locale`). Sentinel `GUEST_VIEWER_ID = "guest-preview"` is passed **only** into pure reads (browse feed, recommendations) — it matches no `User` row, so FK-writing paths would throw; guest profile views therefore use a separate `getGuestProfilePreview`. Guest quota objects are hardcoded `{unlimited:true}` purely to suppress misleading "N left today" copy; every gated button is intercepted client-side by `AuthGateModal`/`gate()` and every action re-checks the real session.

---

## 1. Core Funnel & State Machine

### Stage flow
```
BROWSE (blurred cards)
  │  free: 3 distinct profile opens/day (ProfileViewLog); Pro: unlimited
  ▼
PROFILE DETAIL (view logged, daily-unique)
  │
  ├─► PHOTO ACCESS: PhotoAccessRequest  PENDING ─(owner)─► APPROVED | DENIED   (REVOKED in enum, no code path)
  │     free: 3 new requests/day (DailyUsage.PHOTO_REQUEST); re-send to same owner is free
  │
  ▼
INTEREST: Interest  SENT ─(receiver only)─► ACCEPTED | DECLINED
  │
  ▼  ACCEPTED in EITHER direction == "match" (areUsersMatched)
MESSAGING + VOICE CALL (free for matches; Pro not required)
  gate = mutual ACCEPTED interest AND sender.isMobileVerified
  │
  ▼
Conversation (canonical pair userAId<userBId, @@unique) → Message / CallSession
CallSession: RINGING ─► ACTIVE ─► ENDED
                     ├─► DECLINED (callee rejects/dismisses)
                     ├─► MISSED   (caller hangs up while RINGING) → MISSED_CALL notification
                     └─► CANCELLED (enum only, no code path)
```

### Independent axes (not funnel stages)
- **Photo moderation**: `ProfileImage.moderationStatus` PENDING → APPROVED | REJECTED (admin). Only `isPrimary && moderationStatus=APPROVED` images are ever served to other viewers.
- **Photo privacy**: `ProfileImage.privacy` BLURRED (default) ↔ PUBLIC (owner-set). PUBLIC bypasses the access request entirely.
- **Identity verification**: `nidVerificationStatus`, `selfieVerificationStatus` UNVERIFIED → PENDING → APPROVED | REJECTED. Both APPROVED auto-grants `Profile.isVerified`.
- **Mobile OTP**: `isMobileVerified` — hard gate on messaging & calls.
- **Contact reveal**: there is **no unmasked reveal**. `maskedContact` (masked phone + email) is the only contact data ever serialized; the doc-comment in `getProfileForViewer` describing a "Pro + matched" unmask is stale relative to the implementation.

### Photo visibility resolution (authoritative, `hydrateProfileCards` / `getProfileForViewer`)
```
revealed = image.privacy === "PUBLIC" || photoAccessRequest.status === "APPROVED"
sign(revealed ? originalKey : blurredKey)   // the original key is NEVER signed for a gated viewer
```
Blur is a **server-side sharp derivative** (200px, blur 18, webp q45) — detail is destroyed, not CSS-hidden. Guest: `revealed = privacy === "PUBLIC"` only.

### Managed profiles (no login account)
`Profile.userId = null`, `managedByAgency = true`, `referredById = <manager User.id>`. Created by MEDIA agencies and PARENTS guardians. Social actions route to `profile.userId ?? profile.referredById`, so the manager receives interests/messages on the candidate's behalf. Cards key on `userId ?? profile.id`. `photoAccess` is always `"NONE"` for them.

---

## 2. Server Actions — `lib/actions/`

All are `"use server"`. All revalidate dynamic-route literals (`/[locale]/...`) so every locale param is covered.

### `funnel.ts`
| Action | Params | Rules |
|---|---|---|
| `requestPhotoAccess` | `ownerId` | Returns `PhotoRequestResult {ok, limitReached, unlimited, remaining, limit}`. Blocks if no session, empty ownerId, or self. Looks up existing `PhotoAccessRequest(viewerId,ownerId)`. Daily cap applies **only when no existing row**; blocked → `{limitReached:true}`. Upsert: create PENDING, or update→`status:PENDING, requestedAt:now, respondedAt:null` (re-send resets). On brand-new only: `incrementDailyUsage(PHOTO_REQUEST)`, `remaining-1`, notify owner `PHOTO_REQUEST → /requests`. |
| `respondToPhotoRequest` | `requestId`, `"APPROVED"｜"DENIED"` | **Only `request.ownerId === viewerId`** may respond (silent no-op otherwise). Sets status + `respondedAt`. APPROVED → notify requester `PHOTO_ACCESS_GRANTED → /profiles/{ownerId}`. |
| `sendInterest` | `receiverId`, `note?` | Note trimmed, hard-sliced to 200 chars, `""→null`. Blocks no-session/empty/self. Upsert on `(senderId,receiverId)`: update→`SENT` + note (re-send resets a DECLINED). Notify `INTEREST_RECEIVED → /interests` only on first send. |
| `respondToInterest` | `interestId`, `"ACCEPTED"｜"DECLINED"` | **Only `interest.receiverId === viewerId`** (consent stays with receiver). ACCEPTED → notify sender `INTEREST_ACCEPTED → /messages` (match created implicitly; Conversation row is lazy). |

### `messages.ts`
- `sendMessage(otherUserId, body)` → `{ok,conversationId} | {ok:false,error}`. Errors: `UNAUTH`, `EMPTY`, `TOO_LONG` (>2000), `NOT_VERIFIED` (`!sender.isMobileVerified`), `NOT_MATCHED`. `getOrCreateConversation` is the authoritative match gate. Transaction: create Message + bump `lastMessageAt`. Notify `NEW_MESSAGE` (collapsed per-conversation).
- `markConversationRead(conversationId)` — participant-only; marks incoming `readAt`.
- `startConversation(otherUserId)` → conversationId or `null` (routing helper for the Message button).

### `calls.ts`
- `getIceServers()` — Google STUN always; TURN appended only when `TURN_URL` set, so TURN creds never sit in the client bundle.
- `startCall(otherUserId)` → `{ok,callId,conversationId,otherUserId}` | error `UNAUTH｜NOT_VERIFIED｜NOT_MATCHED`. Creates RINGING `CallSession`; **its cuid doubles as the Realtime signaling channel `call:{id}`** — unguessable, handed only to the two validated peers, so no separate token.
- `acceptCall(callId)` — requires `status===RINGING`, participant, and `viewerId !== callerId`. → ACTIVE + `startedAt`.
- `declineCall(callId)` — same gate → DECLINED + `endedAt` + CALL_EVENT message.
- `endCall(callId)` — **final status derived from current server state, client never trusted.** Participant-only; idempotent no-op on terminal status. ACTIVE → `ENDED` + `CALL_EVENT body "ENDED:{secs}"` (secs = now−startedAt). RINGING + caller → `MISSED` + event + `MISSED_CALL` notify to callee. RINGING + callee → `DECLINED` + event.
- `callEventWrites()` — writes CALL_EVENT `Message` with `senderId = callerId`, compact body (`ENDED:133｜MISSED｜DECLINED`) localized in the thread, + bumps `lastMessageAt`.

### `photos.ts` — result `{ok:true} | {ok:false,error}` (codes localized under `ProfileEdit.photos.errors`)
Authorization chain: `ownProfileId()` → own profile; `resolveAuthorisedProfileId(clientId)` → own profile when no `clientId`, else requires caller `accountCategory ∈ {MEDIA, PARENTS}` **and** `profile.managedByAgency && profile.referredById === viewerId`; `ownImage(imageId, clientId)` confirms the image belongs to that profile — **the security boundary for every mutation**.
- `uploadProfilePhoto(formData{photo, clientId?})` — errors `NO_PROFILE｜EMPTY｜TYPE｜SIZE｜LIMIT｜DECODE｜UPLOAD`. Max `MAX_PHOTOS=6`, 5 MB, jpeg/png/webp. Stores both derivatives. New photo: `privacy: BLURRED`, `isPrimary: count===0`, `sortOrder: count`, `moderationStatus: PENDING` (schema default).
- `deleteProfilePhoto(imageId, clientId?)` — deletes row + both storage objects; if it was primary, promotes next by `sortOrder, createdAt`.
- `setPrimaryPhoto` — transaction: clear old primary, set new.
- `setPhotoPrivacy(imageId, "PUBLIC"｜"BLURRED", clientId?)`.

### `profile.ts`
- `updateProfile(prevState, formData)` → `"OK"｜"UNAUTH"｜"MISSING"｜"AGE"`. If `clientId` present → agency/guardian edit path: caller must be MEDIA or PARENTS **and** own the managed profile, else `UNAUTH`; delegates to `updateProfileById`. Self path upserts by `userId`. **Gender is immutable** — `resolveImmutableGender(stored, submitted)` always returns the stored value once set (security boundary; the locked UI is convenience). Age ≥ 18 enforced. `completionScore` recomputed from 12 fields.

### `onboarding.ts`
- `saveCategoryAction(category)` — writes `accountCategory` **and** syncs `role` via `CATEGORY_TO_ROLE`: `SELF→GENERAL, PARENTS→GUARDIAN, MEDIA→MEDIA, AGENT→AGENT`. Then `revalidatePath("/", "layout")` so the dashboard's onboarding guard re-reads it.
- `saveBasicDetailsAction({gender,dateOfBirth,maritalStatus,profession?,district?})` — required fields, age ≥ 18, upserts Profile; gender intentionally not in the `update` branch (immutable).
- `saveMediaDetailsAction({agencyName,contactPerson,agencyDistrict?})`.

### `auth.ts`
- `authenticate(prevState, formData)` → `"INVALID"` on `AuthError`. Deletes guest cookie (a real login supersedes preview). Builds an **absolute** `redirectTo` from request headers (works around Auth.js base-URL detection dropping the port on Windows).
- `logout()`.
- `register(prevState, formData)` → `"MISSING"｜"WEAK"(<8)｜"AGE"(<18)｜"MOBILE"｜"EXISTS"｜"INVALID"`. Email lowercased; mobile optional but must pass `normalizeBdMobile` (→ `8801XXXXXXXXX`, operator 013–019). Creates User + minimal Profile (`completionScore: 20`). Then `grantSignupSubscription` in a swallowed try/catch — **a failed grant never blocks registration**. P2002 → `EXISTS`. Auto sign-in redirecting to `/onboarding?success=true`.

### `otp.ts` — mobile verification
Tunables: `CODE_TTL_MS = 5 min`, `RESEND_COOLDOWN_MS = 60s`, `MAX_ATTEMPTS = 5`.
- `sendMobileOtp(mobile?)` → errors `UNAUTH｜INVALID_NUMBER｜RATE_LIMITED｜ALREADY`. Omitted `mobile` reuses the account's (resend). Cooldown checked against latest `lastSentAt`. 6-digit code, **stored only as bcrypt hash**, never returned to client (mock provider logs it server-side). Transaction: persist normalized mobile on User + create `MobileOtp`. SMS send failure is logged, never throws.
- `verifyMobileOtp(code)` → errors `UNAUTH｜NO_CODE｜EXPIRED｜TOO_MANY｜INVALID`. Latest unconsumed challenge; wrong code increments `attempts`; success transaction sets `isMobileVerified: true` + `consumedAt` (single-use).

### `verification.ts` — user-side document submission
Private bucket `verification-docs`, keys `{userId}/{nid-front|nid-back|selfie}.{ext}`, `upsert:true`, 5 MB cap. Only keys are persisted.
- `submitNid(formData{nidFront,nidBack})` — rejects when status already `APPROVED` ("already verified") or `PENDING` ("under review"). Sets both keys, `nidVerificationStatus: PENDING`, clears `nidReviewNote` (so a REJECTED user may resubmit).
- `submitSelfie(formData{selfie})` — same shape for `selfieKey`/`selfieVerificationStatus`/`selfieReviewNote`.

### `mediaAgency.ts` (MEDIA account self-service)
- `updateAgencyDetails({agencyName,contactPerson,agencyDistrict?})` — first two required.
- `uploadAgencyLogo(formData{file})` — ≤2 MB, `image/*`, sharp → 256×256 cover webp q85, key `agency/{userId}/logo.webp`.
- `submitTradeLicense(formData{file})` — **caller must be `accountCategory === "MEDIA"`**; refuses if already `VERIFIED`. ≤5 MB, PDF/JPG/PNG/WebP. Key `agency/{userId}/trade_license.{ext}`; sets `agencyVerificationStatus: PENDING_APPROVAL`. Contains defensive migration-not-applied degradation (`errMsg` maps missing-column errors to a "run the migration" hint).

### `mediaClients.ts`
- `createAgencyClientProfile(input)` — **`accountCategory === "MEDIA"` required**. Requires fullName/gender/dateOfBirth, valid date. Creates `Profile` with `userId: null`, `managedByAgency: true`, `referredById: agencyUserId`, `completionScore: 25`. No client count cap.
- `updateAgencyClientProfile({profileId, ...})` — ownership re-check (`managedByAgency && referredById === caller`) → else `"Profile not found or access denied."`

### `guardianClients.ts`
- `createGuardianChildProfile(input)` — **`accountCategory === "PARENTS"` required**, **hard cap `MAX_CHILDREN = 3`** counted over `{referredById: guardian, managedByAgency: true}`. Same managed-profile shape, `completionScore: 25`.

### `agentAssignments.ts` (AGENT field work)
- `startAssignment(assignmentId)` — `updateMany` scoped `{id, agentId: caller, status: PENDING}` → `IN_PROGRESS` + `startedAt`. Scoped-updateMany **is** the authorization (0 rows on mismatch, silent).
- `submitAssignment(assignmentId, note)` — note required; `{id, agentId, status: IN_PROGRESS}` → `SUBMITTED` + `agentNote` + `submittedAt`.
- `uploadAgentAvatar(formData{file})` — ≤2 MB image, sharp 256×256 webp, key `agent/{userId}/avatar.webp` → `User.agentAvatarKey`.

### `jobs.ts` — verification marketplace
- `applyToJob(jobId, bidAmount /*BDT*/, estimatedDeliveryDays, note)` → errors `UNAUTHORIZED｜NOT_AGENT｜ALREADY_APPLIED｜JOB_CLOSED｜INVALID`. Role must be `AGENT` or `ADMIN`. Job must be `OPEN`. **Fee split: `platformFee = round(bid*100*0.2)` (20%), `agentShare = bid*100 − platformFee`.** P2002 → `ALREADY_APPLIED`.
- `requestVerification(targetDistrict, details, budgetBdt)` → `{jobId}` | `UNAUTHORIZED｜INVALID｜MIN_BUDGET`. Any authenticated user. `MIN_VERIFICATION_BUDGET_BDT = 1000`. Creates `JobPost` titled `"Verification Request — {district}"`, status `OPEN`.
- `postJob(formData)` — **ADMIN only**.
- `reviewApplication(applicationId, "ACCEPTED"｜"REJECTED")` — allowed for the **job poster or ADMIN**. Transaction: set application status; on ACCEPTED also `JobPost.status → ASSIGNED`. (No auto-reject of sibling applications.)

### `reports.ts`
- `reportProfile(reportedUserId, reason, note?, imageId?)` → `UNAUTH｜SELF｜REASON`. Reason must be in `{INAPPROPRIATE_PHOTO, FAKE_PROFILE, HARASSMENT, SPAM, OTHER}`. **Dedupe: one OPEN report per (reporter, target)** — a repeat returns `ok` quietly.

### `notifications.ts`
- `markNotificationsRead()` — marks all viewer's `readAt: null` read; revalidates so the bell badge clears.

### `billing.ts`
- `createUpgradeOrder(planCode, locale)` — `createOrder(..., {autoTrigger:"RENEWAL"})`; `finalAmount===0` → `activateOrder(gateway:"promo")` → `/pro/success`; else → `/pro/checkout/{id}`.
- `startPlanCheckout(planCode, locale)` — same, but skips the intermediate screen and calls `initiatePayment` directly (used by `/subscription`).
- `initiatePayment(orderId, locale)` — ownership via `getOrderForViewer`; PAID → success page, non-PENDING → `/pro`. Opens gateway session, redirects (absolute URL as-is; app-relative gets the locale prefix).
- `completeMockPayment(orderId, "SUCCESS"｜"FAIL", locale)` — mock-only IPN stand-in; failure does `updateMany {id, status:PENDING} → FAILED`.
- `localePath(locale, path)` — `en` gets `/en` prefix, `bn` is unprefixed.

### `admin.ts` — every action starts with `assertAdmin()`, returns `{ok:false,error:"FORBIDDEN"}` otherwise
- `approvePhoto(imageId)` → `APPROVED` + `reviewedAt/reviewedById`, clears `rejectionReason`; notify owner `PHOTO_APPROVED` (skipped for `userId=null` managed profiles).
- `rejectPhoto(imageId, reason?)` → `REJECTED` + reason. **Row and storage objects are kept** (audit/appeal); notify `PHOTO_REJECTED`.
- `setVerified(profileId, value)` — keyed by **Profile.id** so managed profiles can be badged. Notifies `VERIFIED_BADGE` only on grant and only when `userId` exists.
- `approveNid｜rejectNid(userId, note?)`, `approveSelfie｜rejectSelfie(userId, note?)` — set status, clear/set review note, notify `NID_*`/`SELFIE_*` → `/profile/verify`.
- `maybeAutoGrantBadge(userId, adminId)` — internal, idempotent: when **both** NID and selfie are `APPROVED`, `updateMany {userId, isVerified:false} → true`; notifies `VERIFIED_BADGE` only if a row actually changed.
- `approveAgency｜rejectAgency(userId)` → `agencyVerificationStatus VERIFIED｜REJECTED`.
- `resetUserPassword(userId, newPassword)` — ADMIN-only; min 8 chars (`TOO_SHORT`), target must exist (`NOT_FOUND`); bcrypt salt 10; existing hash never read or returned.
- `resolveReport(reportId, "RESOLVED"｜"DISMISSED")` → sets `resolvedById/resolvedAt`; notifies reporter `REPORT_RESOLVED` (no link).

---

## 3. Data Fetching Layer — `lib/data/` (all `import "server-only"`)

### `profiles.ts` — the privacy core
- `HIDDEN_NAME = "নাম গোপন রাখা হয়েছে"`; display name = `nameHidden || !fullName ? HIDDEN_NAME : fullName` (applied in every public view; **admin views deliberately skip it** — moderation needs real identities).
- `BROWSE_CARD_INCLUDE` — shared include so grid and recommendations hydrate identically. `images: {where:{isPrimary:true, moderationStatus:"APPROVED"}, take:1}` — PENDING/REJECTED photos **never leave the server**.
- `hydrateProfileCards(rows, viewerId)` — batch-loads the viewer's `PhotoAccessRequest` for the rows' owners, picks per-card `revealed ? originalKey : blurredKey`, batch-signs only those keys. Scales with what's rendered. `trustScore` = 4 signals × 25 (`isVerified`, `isMobileVerified`, `nid APPROVED`, `selfie APPROVED`). `managedBy` badge: `PARENTS→"GUARDIAN"`, `MEDIA→"MEDIA"`.
- `getBrowseProfiles(viewerId, filters, viewerRole?, viewerCategory?)` — feed = `OR[{userId: null}, {userId:{not:null}, NOT:{userId:viewerId}, user:{accountCategory:"SELF"}}]`. Manager/system accounts (PARENTS/MEDIA/AGENT/ADMIN) never appear as candidates even with a stale Profile row. **The explicit OR is required** because SQL `NULL != $id` is NULL, not TRUE, which would silently drop managed rows. Note: managed profiles are visible to *all* viewers; `isPrivilegedViewer` is computed but does not gate that arm. Age filters → `dateOfBirth` bounds; height range → `heightsInRange()` membership (inverted range → `[]` → empty state).
- `getProfileViewAccess(viewerId, profileId)` — **call BEFORE `getProfileForViewer`** (which logs the view). Self-view and active Pro are unlimited. Re-opening a profile already logged today never re-counts (reuses the daily-unique `ProfileViewLog` as the counter, so hint and paywall can't disagree). `allowed = used < FREE_DAILY_LIMIT`.
- `getProfileForViewer(profileId, viewerId)` — resolves by `userId` **or** `profile.id`. Logs a daily-unique `ProfileViewLog` (skips self and manager-less managed profiles; swallows P2002 races). Computes `ownerUserId = profile.userId ?? profile.referredById`. Loads photo request + sent interest + either-direction ACCEPTED interest (all `null` for manager-less managed profiles → neutral locked defaults). `viewerState = {photoAccess, interest, isPro, isMatched}`. **Contact masking: only `maskedContact` (masked phone + masked email) is ever serialized — the raw phone/email never leave the server, matched or not.** `verifications.email` and `.nid` are currently hardcoded `false` in the detail payload.
- `getGuestProfilePreview(profileId)` — deliberately **not** a wrapper: no `ProfileViewLog` write (FK to a real User), no quota, `photoRevealed = privacy === "PUBLIC"` only, `viewer = {NONE, NONE, isPro:false, isMatched:false}`, `maskedContact: undefined`.
- `getEditableProfile(viewerId)` — own form data, blanks when no profile (doubles as first-time setup).
- `getClientEditableProfile(agencyUserId, clientProfileId)` — **null when not `managedByAgency` or `referredById !== caller`; callers must treat null as 403.**

### `photos.ts`
`getOwnPhotos(viewerId)` / `getClientPhotos(agencyUserId, clientProfileId)` → `OwnPhoto[]` signing the **original** (owner always sees their own clear photo) plus `moderationStatus` + `rejectionReason` so pre-approval state is visible to the owner. `getClientPhotos` returns `[]` on a failed ownership check. Never exposed to other viewers.

### `messaging.ts` — authorization primitives
- `areUsersMatched(a,b)` — one ACCEPTED `Interest` in either direction. The single predicate behind messaging, calling, `canSend`, and the dashboard `matches` count.
- `orderedPair(a,b)` — canonical `userAId < userBId`.
- `getOrCreateConversation(viewerId, otherId)` — **returns `null` when not matched (callers treat as forbidden)**; idempotent upsert on the unique pair.

### `messages.ts`
`getConversations(viewerId)` — ordered by `lastMessageAt desc`, last message preview, unread count **restricted to `type: "TEXT"`** (call events are surfaced via notifications, not the badge). `getConversation(viewerId, conversationId)` — **returns null when the viewer isn't a participant (the thread page's security boundary)**; `canSend` reflects the *current* match state. `getUnreadCount(viewerId)` — TEXT only.

### `viewers.ts` — delayed reveal
`REVEAL_DELAY_MS = 24h`. `getProfileViewers(viewerId, limit?)`. `gated = !isProActive(owner) && owner.gender !== "Female"` — active Pro (any gender) and free **female** owners see all viewers immediately; free male/other owners are time-gated. Reveal keys on the viewer's **first** view (`_min.createdAt`), so once revealed always revealed; display time is the **latest** view (`_max`). **Locked entries carry no identity at all — not even the viewer's id — so a locked card cannot be de-anonymized client-side**; identities are only fetched for already-revealed ids. `total` is exact distinct count regardless of `limit`.

### `person.ts`
`personProfileSelect` + `toRequestPerson(user)` → `{id, displayName (HIDDEN_NAME applied), nameHidden, age, district, upazila, isVerified}`. Returns `null` when no profile, and every caller `flatMap`s it away — the shared shape for request/interest/conversation counterpart cards. **No contact fields.**

### `requests.ts` / `interests.ts`
`getReceivedRequests`/`getSentRequests` (scoped by `ownerId`/`viewerId`), `getReceivedInterests` (`receiverId`), newest first. `REVOKED → DENIED` in the inbox mapping.

### `billing.ts`
`getCheckoutPlans(viewerId)` — active plans priced **for this viewer**, folding in the RENEWAL promo per plan (so the page's summary matches what `startPlanCheckout` will charge). `getViewerProStatus` (expiry-aware). `getPhotoRequestQuota` / `getProfileViewQuota` — Pro → `unlimited:true`; view quota counts distinct `ProfileViewLog` rows for today, matching `getProfileViewAccess`'s counter. `getOrderForViewer(orderId, viewerId)` → **null unless `order.userId === viewerId`** (404-safe ownership check used by every payment action).

### `recommend.ts` — "Recommended for You"
Hybrid preferences: each dimension from the viewer's own profile, **overridden by an active search filter**. Two passes for flat cost: (1) index-backed scan (gender + `AGE_GATE_WINDOW = ±10y` via `@@index([gender,dateOfBirth])`) selecting only ~7 scoring columns, scored in memory; (2) hydrate **only the top 20** through `hydrateProfileCards`, so URL signing never touches the candidate set. `score > 0` required. Sort: score → verified → newer. Preferred gender = filter, else opposite of viewer's. Returns `kind:"scored"` or `kind:"fallback"` (most-complete recent candidates, `matchScore: 0` → no badge) — used when scoring is empty *or* the viewer has no profile (MEDIA/ADMIN/PARENTS/guest), so the carousel is never empty.
`lib/matching/`: weights `district 5, ageRange 3, education 2, profession 2, maritalStatus 1` (max 13), `AGE_MATCH_TOLERANCE ±3`, `RECOMMENDED_LIMIT 20`, `MATCH_BADGE_MIN_PERCENT 40` (below that the number is hidden, the profile still shows).

### `profileCompletion.ts`
`COMPLETION_FIELDS` (12, each key doubling as the `ProfileEdit.fields.*` i18n key) → `{score, missing[], hasProfile}`. Recomputed with the same `computeCompletion` the stored score uses.

### `dashboard.ts` / role dashboards
- `getDashboardStats(viewerId)` — `profileViews` (all-time daily-unique views of own profile), `pendingPhotoRequests` (received PENDING), `newInterests` (received SENT), `matches` (ACCEPTED either direction), `firstName`.
- `getAgentDashboardData(agentUserId)` — own assignments only; `totalEarned` = Σ `agentShare` over VERIFIED; `pendingCount` = PENDING+IN_PROGRESS+SUBMITTED; `isVerified = role === "AGENT"`.
- `getMediaDashboardData(agencyUserId)` — agency fields + signed logo + clients where `{referredById: caller, managedByAgency: true}`; `activeCount` = `completionScore > 30 && fullName`.
- `getGuardianDashboardData(guardianUserId)` — same shape for children.
- `getJobBoard(viewerId, district?)` — OPEN jobs + `myApplication` folded in. `getMyPostedJobs(userId)` — own posts with all applications.

### `admin.ts` / `adminVerifications.ts`
`getAdminStats`, `getPendingPhotos` (oldest first, signed originals, `"(agency client)"` for managed), `getOpenReports` (batch-signs reported photos), `getAdminUsers`, `getVerificationProfiles(filter)` (take 100, includes managed profiles keyed by Profile.id). `adminVerifications.ts` signs the **`verification-docs`** bucket with a 1h TTL and returns null on any signing failure: `getPendingNids`, `getPendingSelfies`, `getPendingAgencies` (status `PENDING_APPROVAL`), `getPendingVerificationCount` (nid + selfie + agency, drives the admin nav badge). Note `submittedAt` is sourced from `User.createdAt`, not an actual submission timestamp.

### `showcase.ts` (public homepage, no auth)
`getMarqueeProfiles(limit=10)`, `getHomepageShowcase()` → premium (`accountCategory:"SELF", isPro:true`), new, verified — each `take: 3`, de-duplicated via `notIn`.

### `privacy.ts` — mask format, single source of truth, **idempotent** (re-masking is safe)
`maskPhone("01812345678") → "018****5678"` (≤7 chars → `"0****"`); `maskEmail("abcdef@gmail.com") → "a***@gmail.com"`; `maskContact` auto-detects by `"@"`.

### `notifications/dispatch.ts` — `notify({userId, type, actorId?, link?})`
**The single writer of `Notification` rows** and the future fan-out chokepoint (email/SMS/push). Skips self-notifications. Collapses `NEW_MESSAGE` when an unread one already exists for the same `(userId, link)`. **All errors are logged and swallowed — a notification failure must never break the user action that triggered it.**

---

## 4. Billing & Quotas — `lib/billing/`

### Catalog (`lib/constants/plans.ts`, seeded into `Plan`/`Coupon`; resolved at runtime by **code**, never by id)
`TAKA = 100`. `FREE_DAILY_LIMIT = 3` — applies **per action per UTC day** to both `PROFILE_VIEW` and `PHOTO_REQUEST`.

| Plan | days | price |
|---|---|---|
| `PRO_1M` | 30 | ৳1,200 (120000 poisha) |
| `PRO_3M` | 90 | ৳3,000 |
| `PRO_12M` | 365 | ৳9,000 |

| Coupon | discount | trigger | applies / grants | limits |
|---|---|---|---|---|
| `WELCOME3MO` | PERCENT 100 | `SIGNUP` | `PRO_3M` / grants `PRO_3M` | perUser 1, global ∞ |
| `FIRSTYEAR90` | PERCENT 90 | `RENEWAL` | any plan | perUser 1, global ∞ |

### `pricing.ts` — pure math, no I/O
`computeDiscount` (PERCENT clamped 0–100, FIXED floored at 0, result clamped to `[0, base]` so an order can never go negative). `priceOrder`. **`isProActive(user, now)`** — `proExpiresAt` is the source of truth: set → active strictly while in the future (**access lapses the instant it passes; no cron needed for correctness**); null → falls back to `isPro` (perpetual/admin-granted). `nextSubscriptionStart(currentEndsAt, now)` — **renewal stacking**: later of now and current end, so renewing early extends rather than overwrites. `addDays`, `formatTaka` (English digits + grouping in both locales, pair with a localized ৳ label), `formatInvoiceNo` → `MM-YYYYMMDD-####`.

### `usage.ts` — daily caps
`startOfDayUTC` (matches `ProfileViewLog`'s `@db.Date`). `getDailyUsageCount`, `checkDailyLimit(user, action)` → `{allowed, unlimited, limit, used, remaining}` (active Pro short-circuits to `unlimited:true, limit:Infinity`), `incrementDailyUsage` (upsert + `{increment:1}`), `assertWithinDailyLimit` (throws `DailyLimitError`). **Two different counters by design:** `PHOTO_REQUEST` uses `DailyUsage`; `PROFILE_VIEW` is counted off distinct `ProfileViewLog` rows (so a repeat view is inherently free) — the `PROFILE_VIEW` enum member exists but the view path doesn't increment `DailyUsage`.

### `coupons.ts`
`isCouponRedeemable` — pure: `isActive`, `validFrom/validUntil` window, global `maxRedemptions` vs `redeemedCount`, `perUserLimit` vs that user's redemption count. `resolveTriggeredCoupon(userId, trigger, planCode)` — candidates where `trigger` matches and `appliesToPlan ∈ {null, planCode}`, ordered `appliesToPlan desc` so **plan-specific wins over any-plan**; first redeemable wins. `resolveCouponByCode` for manual entry. Promotions are pure data — change the row, not the code.

### `orders.ts`
- `generateInvoiceNo(now)` — `MM-YYYYMMDD-####` from the day's order count + 1, probes 5 candidates on collision, then falls back to a timestamp suffix.
- `createOrder(userId, planCode, {coupon?, autoTrigger?})` — plan must exist and be `isActive` else throw. Explicit `coupon` beats `autoTrigger`. **Snapshots `planName/durationDays/baseAmount/discountAmount/finalAmount/currency/couponCode` onto the Order** so later catalog edits never rewrite history. Status `PENDING`. **Grants nothing.**
- `activateOrder(orderId, {gateway?, gatewayTxnId?})` — **the ONLY place Pro access is granted; drive it from a server-verified IPN, never a client redirect.** Already `PAID` → `{alreadyActive:true}` no-op; any other non-PENDING status throws. Inside a transaction: **atomic compare-and-set claim** `updateMany WHERE {id, status:PENDING} → PAID` (`count===0` → someone else won → no-op, so **a replayed IPN can never double-extend**); create `Subscription` with `startsAt = nextSubscriptionStart(user.proExpiresAt)`, `endsAt = startsAt + durationDays`, `ACTIVE`; set `User.isPro = true, proExpiresAt = endsAt`; on coupon → create `CouponRedemption` + increment `Coupon.redeemedCount`; create a `Payment(SUCCESS)` **only when `finalAmount > 0`** (a 100%-off grant moves no money, so no Payment row).
- `grantSignupSubscription(userId)` — signup hook: finds active `SIGNUP` coupons with a `grantsPlanCode`, oldest first, skipping ones over per-user/global caps; creates the order; if `finalAmount === 0` activates immediately with `gateway:"signup-grant"` (**instant Pro, no gateway**) and re-reads so the caller sees PAID; a promo leaving a balance is left PENDING for normal checkout. Returns null when no promo applies.

### `expiry.ts` + cron
`runExpirySweep(now)` — **bookkeeping only; correctness never depends on it** since `isProActive` already treats an elapsed `proExpiresAt` as free. (1) `Subscription {ACTIVE, endsAt <= now} → EXPIRED`. (2) `User {isPro:true, proExpiresAt: {lte: now}, subscriptions: {none: {ACTIVE, endsAt > now}}} → isPro:false`. Two guards: `proExpiresAt <= now` never matches null, so **admin-granted lifetime Pro is preserved**; the `subscriptions none` guard refuses to downgrade anyone holding an ACTIVE future subscription (defends against drift with a stacked renewal). `proExpiresAt` is never cleared (it records when access ended). Idempotent.
`GET|POST /api/cron/expire` — requires `Authorization: Bearer $CRON_SECRET` (or `?key=`); **with no `CRON_SECRET` configured it refuses to run**, so it can never fire anonymously. `vercel.json` schedules `10 0 * * *`.

### Gateway abstraction (`gateway.ts`)
`PaymentGateway { name, createSession({order, returnUrl, appUrl?, locale?}) → {redirectUrl}, verifyIpn(payload) → {orderId, success, gatewayTxnId?} }`. Registry `{mock, sslcommerz}`; `DEFAULT_GATEWAY = process.env.PAYMENT_GATEWAY ?? "sslcommerz"`. **`verifyIpn` is the only trusted signal** — never the client redirect. `MockGateway` "hosts" checkout at the in-app `/pro/pay/{orderId}` and builds its IPN payload from the simulated outcome.

### `gateways/sslcommerz.ts` (bKash/Nagad/cards via hosted checkout)
Config env-driven, defaults to the public sandbox store (`testbox`/`qwerty`); `SSLCOMMERZ_SANDBOX !== "false"` → sandbox host. `appBase()` **throws when neither `appUrl` nor `APP_URL` is set** (callbacks need an absolute origin).
- `createSession` — POSTs store creds + order to `/gwprocess/v4/api.php`. `total_amount = finalAmount/100` (2dp), `tran_id = order.id` (echoed back in every callback), callbacks → `/api/payments/sslcommerz/{success,abort,abort}` + `ipn_url → /api/payments/sslcommerz/ipn`. Mandatory customer fields filled from the buyer with fallbacks. **`value_a` carries the locale** so callbacks can return the user to the right path. Non-`SUCCESS` status or missing `GatewayPageURL` → throw.
- `verifyIpn` — `tran_id` required; **no `val_id` → `success:false`** (failed/cancelled attempt). Re-queries the Validation API with `val_id` + store creds, then re-checks **against our own Order**: `status ∈ {VALID, VALIDATED}` **AND** `currency === order.currency` **AND** `round(paid*100) === order.finalAmount` — **defeating a tampered callback claiming a smaller payment**. Rejections are logged with status/currency/amount. `gatewayTxnId = bank_tran_id ?? val_id`.

### Payment routes
- `POST /api/payments/[gateway]/ipn` — out-of-band. Unknown gateway → 404; accepts JSON or form-encoded; `verifyIpn` throw → 400; **only a verified success calls `activateOrder`** (idempotent, replay-safe).
- `POST /api/payments/sslcommerz/success` — browser POST; **re-validates via `verifyIpn` and activates idempotently, backstopping a delayed or missing server-to-server IPN**; the client POST is never trusted alone. 303 → `/pro/success?order=` or `/pro/checkout/{id}?status=failed`.
- `POST /api/payments/sslcommerz/abort` — no activation; 303 back to checkout with a retry message.

### Paywall trigger points (complete list)
1. **Profile open** — `getProfileViewAccess` in `app/[locale]/profiles/[id]/page.tsx`, checked *before* the view is logged; blocked → a full-page "Pro.viewLimit" upsell instead of the profile.
2. **Photo request** — `requestPhotoAccess` returns `limitReached`; new requests only.
3. **Profile viewers list** — `gated` (free male/other owners wait 24h; Pro sees instantly).
4. Quota hints rendered from `getPhotoRequestQuota` / `getProfileViewQuota`.

Messaging and voice calls are **free for matches** — never paywalled.

---

## 5. Verification & Roles

### Role / category model
`Role`: `GENERAL | GUARDIAN | MEDIA | AGENT | ADMIN` (authorization). `AccountCategory`: `SELF | PARENTS | MEDIA | AGENT` (onboarding intent). Set together by `saveCategoryAction` (`SELF→GENERAL, PARENTS→GUARDIAN, MEDIA→MEDIA, AGENT→AGENT`). **`ADMIN` is never self-assignable** — it must be set out-of-band in the DB. Role is always read from the DB, never from the JWT. Guards are checked against `role` (`jobs.ts`, `requireAdmin`) or `accountCategory` (managed-profile paths) depending on the call site.

Routing: `/` is a public marketing homepage for everyone. `/dashboard` requires a session and **redirects to `/onboarding` when `accountCategory` is unset (ADMIN exempt)**. `/admin/*` is gated by its layout via `requireAdmin`.

### GENERAL (SELF)
Own profile, own photos, full funnel. Gender immutable after first set. Age ≥ 18 at register/edit.

### PARENTS / GUARDIAN
Creates up to **3** managed child profiles (`userId: null`, `managedByAgency: true`, `referredById`, `completionScore: 25`). May edit those profiles and manage their photos (`accountCategory ∈ {MEDIA, PARENTS}` + ownership). Receives interests/messages on the child's behalf (social actions route to `referredById`). Has no own candidate profile → recommendations fall back to the gender-agnostic set. Managed children are shown a `"GUARDIAN"` badge and appear in **every** viewer's browse feed.

### MEDIA (agency)
Unlimited managed client profiles, same shape and same photo/profile-edit authorization. Agency fields: `agencyName, contactPerson, agencyDistrict, agencyLogo, tradeLicenseUrl`. Verification track: `AgencyVerificationStatus UNVERIFIED → PENDING_APPROVAL` (on `submitTradeLicense`, MEDIA-only, refused once VERIFIED) `→ VERIFIED | REJECTED` (admin `approveAgency`/`rejectAgency`; **no notification is dispatched on either**). Dashboard exposes `hasTradeLicense`, status, `activeCount` (`completionScore > 30 && fullName`).

### AGENT (field verification)
Role `AGENT`. Two revenue paths:
1. **Assigned work** — `VerificationAssignment` (`profileId` unique, so one assignment per profile): `PENDING → IN_PROGRESS → SUBMITTED → VERIFIED | CANCELLED`. Default economics `totalFee 250000` (৳2,500) = `agentShare 200000` (৳2,000) + `platformFee 50000` (৳500). Agent-side transitions are authorization-scoped `updateMany` (`{id, agentId, status}`). `startedAt/submittedAt/completedAt` stamp the stages. `assignedBy`/`agent` are `onDelete: Restrict`. **Gap: no code path creates an assignment and none moves `SUBMITTED → VERIFIED/CANCELLED`** — creation and admin sign-off are unimplemented.
2. **Job marketplace** — `JobPost` `OPEN → ASSIGNED → CLOSED`; any user posts a verification request (min ৳1,000); ADMIN posts arbitrary jobs. Agent bids via `applyToJob` (unique per job+agent); **20% platform fee** on the bid; poster or ADMIN accepts → application `ACCEPTED` + job `ASSIGNED`. Agent dashboard: own assignments, `totalEarned` over VERIFIED, own applications.

`ServiceRequest` (agent/requester/targetProfile, `agentShare`/`adminShare`, `ServiceStatus PENDING → IN_PROGRESS → VERIFIED`) exists in the schema with **no code path** — legacy/unused, superseded by `VerificationAssignment` + `JobPost`.

### ADMIN
`assertAdmin()` / `requireAdmin()` on every surface. Powers: photo moderation, `setVerified` by Profile.id, NID/selfie/agency approval, password reset, report resolution, job posting, application review. Admin views bypass `nameHidden`.

### Identity verification workflow (per user)
```
NID:    UNVERIFIED ─submitNid──► PENDING ─approveNid──► APPROVED
                                        └rejectNid──► REJECTED (+nidReviewNote) ─resubmit(clears note)─► PENDING
SELFIE: same shape (submitSelfie / approveSelfie / rejectSelfie / selfieReviewNote)
        NID APPROVED && SELFIE APPROVED ──► Profile.isVerified = true (maybeAutoGrantBadge, idempotent)
```
Resubmission is blocked while `PENDING` or `APPROVED`. Documents live in the private `verification-docs` bucket; only storage keys are persisted; admin reads them via 1-hour signed URLs. `Profile.isVerified` can also be set/revoked directly by `setVerified`.

### Trust signals surfaced to other viewers
`trustScore` = 25 pts each for `Profile.isVerified`, `User.isMobileVerified`, `nidVerificationStatus === APPROVED`, `selfieVerificationStatus === APPROVED`. `isMobileVerified` is additionally a **hard gate** on `sendMessage` and `startCall`.

---

## 6. Integrations & Infrastructure

- **Storage** (`lib/storage/`): server-only Supabase admin client (service-role key, lazily constructed so builds never throw on missing env, cached across hot reloads). Buckets: `profile-photos` (default, `SUPABASE_STORAGE_BUCKET`) and `verification-docs`. `SIGNED_URL_TTL = 1h`. **Uploads throw loudly; `signUrl`/`signUrls` return null on failure so read paths degrade to a placeholder rather than 500.** `images.ts`: `MAX_PHOTOS 6`, `MAX_UPLOAD_BYTES 5MB`, `ALLOWED_MIME jpeg/png/webp`; original = auto-rotated, EXIF-stripped, ≤1600px, webp q82; blurred = ≤200px, `blur(18)`, webp q45 — **downsampled so the original cannot be recovered; this is the privacy boundary, not CSS blur.** Keys `{profileId}/{uuid}.webp` and `..._blur.webp`.
- **Realtime / WebRTC** (`lib/realtime/client.ts`): browser client on the public ANON key, returns null when env is absent (call features simply no-op). Channels: `ring:{userId}` (per-user incoming-ring) and `call:{CallSession.id}` (per-call SDP/ICE). ICE servers are fetched from the server at call time so TURN creds never sit in the bundle.
- **SMS** (`lib/sms/`): `SmsProvider` registry `{mock, sslwireless}`, `SMS_PROVIDER ?? "mock"` (mock logs the code server-side, so the app runs uncredentialed). Mirrors the gateway pattern.
- **i18n**: `bn` default and unprefixed, `en` at `/en`. Numerals stay English in both locales (`formatTaka`, `formatDate` use `en-US`) and pair with localized currency labels.
- **Env**: `DATABASE_URL`, `DIRECT_URL`, `APP_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PAYMENT_GATEWAY`, `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWD`, `SSLCOMMERZ_SANDBOX`, `SMS_PROVIDER`, `CRON_SECRET`, `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`.

## 7. Cross-Cutting Invariants

1. **Every mutation re-derives the actor from the session** (`getViewerId`/`requireViewerId`) and re-checks authorization server-side; no UI gate is ever load-bearing.
2. **Consent stays with the recipient** — only the photo owner responds to a photo request; only the interest receiver accepts.
3. **Raw contact data never leaves the server.** Only masked strings are serialized, and masking is idempotent.
4. **A gated viewer's `originalKey` is never signed.**
5. **`activateOrder` is the single grant point for Pro**, atomically claimed and therefore replay-safe.
6. **`isProActive` is the runtime source of truth for entitlement**; `isPro` is a fast-path flag the cron keeps tidy.
7. **`notify()` is the single Notification writer** and never propagates failures.
8. Side-effect hooks that must not break their caller (`grantSignupSubscription`, `notify`, SMS send) are individually try/catch-swallowed and logged.
9. Silent no-ops are the deliberate failure mode for unauthorized funnel/assignment mutations (scoped `updateMany` or an early `return`), rather than thrown errors.
10. Money is integer poisha end to end; floats appear only at the gateway boundary and in display formatting.

## 8. Known Gaps / Stale Notes in the Code

- `VerificationAssignment` has **no creation path** and no `SUBMITTED → VERIFIED/CANCELLED` transition.
- `ServiceRequest` and `WardDetails` models are unreferenced by any code.
- `PhotoAccessStatus.REVOKED` and `CallStatus.CANCELLED` have no code paths.
- `UsageAction.PROFILE_VIEW` is defined but never incremented (views are counted via `ProfileViewLog`).
- `funnel.ts` retains a stale `TODO(auth): ... CURRENT_VIEWER_ID` comment; the session is in fact used.
- `getProfileForViewer`'s header comment describes a "Pro + matched" unmasked-contact gate that the implementation does not do (it always masks).
- `ProfileDetailView.verifications.email` and `.nid` are hardcoded `false` despite the underlying NID status existing.
- `areUsersMatched` is imported but unused in `lib/actions/messages.ts` (reached via `getOrCreateConversation`).
- `isPrivilegedViewer` is computed in `getBrowseProfiles` and the browse page but does not actually gate the managed-profile arm.
- `adminVerifications.ts` reports `submittedAt` from `User.createdAt` (no real submission timestamp column).
- `approveAgency`/`rejectAgency` dispatch no notification, unlike every other admin decision.
- `mediaAgency.ts` contains migration-not-applied fallbacks, implying the agency-verification columns may be unmigrated in some environments.
