"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  requestPhotoAccess as requestPhotoAccessAction,
  sendInterest as sendInterestAction,
} from "@/lib/actions/funnel";
import { startConversation } from "@/lib/actions/messages";
import { QuotaNote } from "@/components/billing/PhotoQuota";
import type { PhotoQuota } from "@/lib/data/billing";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardTitle } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import {
  ShieldCheckIcon,
  StarIcon,
  CrownIcon,
  HeartIcon,
  CheckIcon,
  LockIcon,
  MapPinIcon,
  BriefcaseIcon,
  GraduationIcon,
  RingIcon,
  ChatIcon,
  PhoneIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { useCallControls } from "@/components/calls/CallProvider";
import {
  ContactGateHint,
  ContactGateModal,
} from "@/components/contact/ContactGateNotice";
import {
  GUEST_CONTACT_GATE,
  type ContactGateStatus,
} from "@/types/contactGate";
import { useGuestGate } from "@/components/auth/GuestModeContext";
import { MaskedContact } from "@/components/privacy/MaskedContact";
import { computeCompletion } from "@/lib/utils";
import { localize } from "@/lib/constants/labels";
import { BlurredImage } from "./BlurredImage";
import { ReportButton } from "./ReportButton";
import { TrustCard } from "./TrustCard";
import type { ProfileDetailView, ViewerState } from "./types";

/**
 * Both modals start closed and only ever open on an explicit click, so their
 * code has no business in this route's first load — `profiles/[id]` is the
 * heaviest page in the app. `ssr: false` because neither renders anything until
 * opened, so there is no markup to hydrate and nothing shifts when the chunk
 * arrives.
 *
 * No loading skeleton: the chunk is small and fetched on the click that opens
 * the dialog, so a placeholder would flash more than it would reassure.
 */
const FullDetailsModal = dynamic(
  () => import("./FullDetailsModal").then((m) => m.FullDetailsModal),
  { ssr: false },
);

const ExpressInterestModal = dynamic(
  () => import("./ExpressInterestModal").then((m) => m.ExpressInterestModal),
  { ssr: false },
);

/** Links the muted Message / Call buttons to the helper line below them. */
const CONTACT_HINT_ID = "contact-gate-hint";

interface ProfileDetailProps {
  data: ProfileDetailView;
  quota: PhotoQuota;
  /**
   * The VIEWER's contact gate (see lib/contactGate). Omitted on the guest
   * preview, where the auth gate intercepts every action first.
   */
  gate?: ContactGateStatus;
}

/**
 * Profile Detail page (presentational).
 *
 * The funnel state is held in local React state so the page is a clickable
 * demo. Each handler is where a real API call will go later — see the
 * `// TODO(api)` markers. No backend / business logic is wired yet.
 *
 * UI strings come from the `Profile` next-intl namespace. NOTE: profile DATA
 * values (gender, district, profession, bio, ...) are not translated here —
 * they come from the DB and render as stored regardless of locale.
 */
export function ProfileDetail({
  data,
  quota: initialQuota,
  gate = GUEST_CONTACT_GATE,
}: ProfileDetailProps) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const router = useRouter();
  const { placeCall, canCall } = useCallControls();
  const { gate: guestGate } = useGuestGate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [quota, setQuota] = useState(initialQuota);
  const [gateModalOpen, setGateModalOpen] = useState(false);

  /**
   * A guest is blocked too, but `guestGate()` already routes them to the auth modal,
   * so showing the verification copy as well would stack two different asks.
   */
  const contactBlocked = !gate.allowed && gate.reason !== "UNAUTHENTICATED";

  // UI is driven by server state; mutations + revalidatePath refresh `data`.
  const viewer = data.viewer;

  // The daily cap only blocks brand-new requests (no prior row for this owner).
  const isNewRequest = viewer.photoAccess === "NONE";
  const photoLimitReached =
    !quota.unlimited && isNewRequest && quota.remaining <= 0;
  // Admins bypass the photo-privacy gate entirely (server signed the original).
  const photoRevealed =
    viewer.isAdmin ||
    data.primaryImagePrivacy === "PUBLIC" ||
    viewer.photoAccess === "APPROVED";

  // Freemium: completion is derived purely from which data fields are present.
  const completion = computeCompletion([
    data.gender,
    data.age,
    data.district,
    data.upazila,
    data.profession,
    data.education,
    data.maritalStatus,
    data.bio,
    data.details.height,
    data.details.weight,
    data.details.childrenStatus,
    data.details.family.raw,
    data.details.religion,
    data.details.sect,
    data.details.caste,
    data.details.diet,
    data.details.smokingStatus,
  ]);

  function requestPhotoAccess() {
    if (guestGate()) return; // guest -> AuthGateModal shown, no request sent
    if (photoLimitReached) return;
    startTransition(async () => {
      const result = await requestPhotoAccessAction(data.id);
      if (!result.unlimited) {
        setQuota((q) => ({ ...q, remaining: result.remaining }));
      }
    });
  }

  function openExpressInterest() {
    if (guestGate()) return; // guest -> AuthGateModal shown, modal never opens
    setInterestModalOpen(true);
  }

  function confirmExpressInterest(note: string) {
    startTransition(async () => {
      await sendInterestAction(data.id, note);
      setInterestModalOpen(false);
    });
  }

  function openConversation() {
    if (guestGate()) return; // guest -> AuthGateModal shown, no conversation started
    // Blocked by the contact gate: explain it instead of starting a thread the
    // member cannot type in.
    if (contactBlocked) return setGateModalOpen(true);
    startTransition(async () => {
      const id = await startConversation(data.id);
      if (id) router.push(`${locale === "en" ? "/en" : ""}/messages/${id}`);
    });
  }

  function callViewer() {
    if (guestGate()) return; // guest -> AuthGateModal shown, no call placed
    if (contactBlocked) return setGateModalOpen(true);
    placeCall(data.id, data.displayName);
  }

  return (
    <Container className="py-6 sm:py-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr]">
        {/* ---------- Left: photo + primary actions ---------- */}
        <div className="space-y-4">
          <BlurredImage
            privacy={data.primaryImagePrivacy}
            state={viewer.photoAccess}
            src={data.imageUrl}
            name={data.displayName}
            onRequest={requestPhotoAccess}
            pending={isPending}
            requestDisabled={photoLimitReached}
            adminView={viewer.isAdmin}
            moderation={data.primaryImageModeration}
          />

          {/* Quota feedback — only while the photo is still gated */}
          {!photoRevealed && <QuotaNote quota={quota} />}

          <InterestAction
            state={viewer.interest}
            onExpress={openExpressInterest}
            pending={isPending}
          />

          {/* Matched users can chat + voice-call in-app (free, no Pro required).
              While the contact gate blocks contact the buttons stay clickable
              and read as unavailable (opacity + helper line): a disabled button
              is the dead end that loses the member. */}
          {viewer.isMatched && (
            <>
              <Button
                variant="secondary"
                fullWidth
                onClick={openConversation}
                disabled={isPending}
                aria-describedby={contactBlocked ? CONTACT_HINT_ID : undefined}
                className={contactBlocked ? "opacity-60" : undefined}
              >
                <ChatIcon width={18} height={18} />
                {t("message")}
              </Button>
              {canCall && (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={callViewer}
                  aria-describedby={contactBlocked ? CONTACT_HINT_ID : undefined}
                  className={contactBlocked ? "opacity-60" : undefined}
                >
                  <PhoneIcon width={18} height={18} />
                  {t("call")}
                </Button>
              )}
              {/* One-click route to the fix, right under the triggers. */}
              <ContactGateHint
                id={CONTACT_HINT_ID}
                status={gate}
                className="px-1 text-center"
              />
            </>
          )}

          <CompletionMeter score={completion} />
        </div>

        {/* ---------- Right: identity + details ---------- */}
        <div className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">
                {data.displayName}
              </h1>

              {/* Pro — gold crown badge */}
              {data.isPro && (
                <span className="inline-flex items-center gap-1 rounded-pill border border-accent/30 bg-gradient-to-r from-accent/20 to-amber-100/60 px-2.5 py-0.5 text-xs font-semibold text-amber-700 shadow-sm">
                  <CrownIcon width={13} height={13} className="text-accent" />
                  {t("vip")}
                </span>
              )}

              {/* Overall identity verified — blue-tinted shield */}
              {data.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-pill border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 shadow-sm">
                  <ShieldCheckIcon width={13} height={13} className="text-sky-500" />
                  {t("verified")}
                </span>
              )}

              {data.managedBy === "GUARDIAN" && (
                <span className="inline-flex items-center gap-1 rounded-pill border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 shadow-sm">
                  <UsersIcon width={13} height={13} className="text-sky-500" />
                  {t("managedByParents")}
                </span>
              )}
              {data.managedBy === "MEDIA" && (
                <span className="inline-flex items-center gap-1 rounded-pill border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 shadow-sm">
                  <BriefcaseIcon width={13} height={13} className="text-violet-500" />
                  {t("managedByAgency")}
                </span>
              )}

              {data.nameHidden && (
                <Badge variant="neutral" icon={<LockIcon width={14} height={14} />}>
                  {t("nameHidden")}
                </Badge>
              )}
            </div>

            <p className="text-sm text-ink/60">
              {t.rich("ageLine", {
                age: String(data.age),
                gender: localize(data.gender, locale),
                upazila: localize(data.upazila, locale),
                district: localize(data.district, locale),
                n: (chunks) => (
                  <span className="font-body font-semibold text-ink/80">
                    {chunks}
                  </span>
                ),
              })}
            </p>

            {data.referredByMedia && (
              <Badge variant="gold">
                {t("mediaPartner", { name: data.referredByMedia })}
              </Badge>
            )}
          </header>

          {/* Key facts */}
          <Card>
            <CardBody>
              <CardTitle>{t("keyFacts")}</CardTitle>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Fact
                  icon={<MapPinIcon />}
                  label={t("facts.address")}
                  value={`${localize(data.upazila, locale)}, ${localize(data.district, locale)}`}
                />
                <Fact
                  icon={<BriefcaseIcon />}
                  label={t("facts.profession")}
                  value={localize(data.profession, locale)}
                />
                <Fact
                  icon={<GraduationIcon />}
                  label={t("facts.education")}
                  value={localize(data.education, locale)}
                />
                <Fact
                  icon={<RingIcon />}
                  label={t("facts.maritalStatus")}
                  value={localize(data.maritalStatus, locale)}
                />
              </dl>

              <div className="mt-5 border-t border-ink/10 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailsOpen(true)}
                >
                  {t("viewFullDetails")}
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Bio */}
          <Card>
            <CardBody>
              <CardTitle>{t("about")}</CardTitle>
              <p className="text-sm leading-7 text-ink/80">{data.bio}</p>
            </CardBody>
          </Card>

          {/* Trust & Verifications breakdown */}
          <TrustCard verifications={data.verifications} />

          {/* Privacy-first: phone & email are shown masked only, never raw. */}
          <PrivacyNote contact={data.maskedContact} />

          {/* Trust & safety: report this profile */}
          <div className="flex justify-end pt-1">
            <ReportButton reportedUserId={data.id} />
          </div>
        </div>
      </div>

      {/* Full Details modal */}
      <FullDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        details={data.details}
        displayName={data.displayName}
      />

      {/* Contact gate — why messaging / calling is not open yet */}
      <ContactGateModal
        open={gateModalOpen}
        onClose={() => setGateModalOpen(false)}
        status={gate}
      />

      {/* Express Interest modal — optional introductory note */}
      <ExpressInterestModal
        open={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
        onConfirm={confirmExpressInterest}
        pending={isPending}
      />
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <dt className="text-xs text-ink/50">{label}</dt>
        <dd className="text-sm font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

function InterestAction({
  state,
  onExpress,
  pending,
}: {
  state: ViewerState["interest"];
  onExpress: () => void;
  pending?: boolean;
}) {
  const t = useTranslations("Profile.interest");

  if (state === "ACCEPTED") {
    return (
      <Button variant="secondary" fullWidth disabled>
        <CheckIcon width={18} height={18} />
        {t("accepted")}
      </Button>
    );
  }
  if (state === "SENT") {
    return (
      <Button variant="outline" fullWidth disabled>
        {t("sent")}
      </Button>
    );
  }
  if (state === "DECLINED") {
    return (
      <Button variant="ghost" fullWidth disabled>
        {t("declined")}
      </Button>
    );
  }
  return (
    <Button variant="primary" fullWidth onClick={onExpress} disabled={pending}>
      <HeartIcon width={18} height={18} />
      {t("express")}
    </Button>
  );
}

function CompletionMeter({ score }: { score: number }) {
  const t = useTranslations("Profile");
  const pct = Math.max(0, Math.min(100, score));
  return (
    <Card>
      <CardBody className="!p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-ink/60">{t("completion")}</span>
          <span className="font-body text-xs font-semibold text-primary">
            {pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Privacy-first: phone numbers and emails are never exposed on the platform.
 * This card replaces the old contact-reveal section and steers users to the
 * on-platform channels (in-app message + voice call). The masked rows are a
 * trust signal — the values arrive from the server ALREADY masked.
 */
function PrivacyNote({
  contact,
}: {
  contact?: { phone?: string; email?: string };
}) {
  const t = useTranslations("Profile.privacyNote");
  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheckIcon width={18} height={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{t("title")}</p>
            <p className="mt-0.5 text-sm text-ink/60">{t("body")}</p>
          </div>
        </div>
        {(contact?.phone || contact?.email) && (
          <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
            {contact.phone && (
              <div>
                <dt className="text-xs text-ink/50">{t("phone")}</dt>
                <dd className="mt-0.5">
                  <MaskedContact value={contact.phone} />
                </dd>
              </div>
            )}
            {contact.email && (
              <div>
                <dt className="text-xs text-ink/50">{t("email")}</dt>
                <dd className="mt-0.5">
                  <MaskedContact value={contact.email} />
                </dd>
              </div>
            )}
          </dl>
        )}
      </CardBody>
    </Card>
  );
}
