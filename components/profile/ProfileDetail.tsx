"use client";

import { useState, useTransition } from "react";
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
import { Modal } from "@/components/ui/Modal";
import {
  ShieldCheckIcon,
  StarIcon,
  HeartIcon,
  CheckIcon,
  LockIcon,
  MapPinIcon,
  BriefcaseIcon,
  GraduationIcon,
  RingIcon,
  ChatIcon,
  PhoneIcon,
} from "@/components/ui/icons";
import { useCallControls } from "@/components/calls/CallProvider";
import { computeCompletion } from "@/lib/utils";
import { localize } from "@/lib/constants/labels";
import { BlurredImage } from "./BlurredImage";
import { ReportButton } from "./ReportButton";
import type { ProfileDetailView, ViewerState } from "./types";

interface ProfileDetailProps {
  data: ProfileDetailView;
  quota: PhotoQuota;
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
export function ProfileDetail({ data, quota: initialQuota }: ProfileDetailProps) {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const router = useRouter();
  const { placeCall, canCall } = useCallControls();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [quota, setQuota] = useState(initialQuota);

  // UI is driven by server state; mutations + revalidatePath refresh `data`.
  const viewer = data.viewer;

  // The daily cap only blocks brand-new requests (no prior row for this owner).
  const isNewRequest = viewer.photoAccess === "NONE";
  const photoLimitReached =
    !quota.unlimited && isNewRequest && quota.remaining <= 0;
  const photoRevealed =
    data.primaryImagePrivacy === "PUBLIC" || viewer.photoAccess === "APPROVED";

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
    data.details.family,
  ]);

  function requestPhotoAccess() {
    if (photoLimitReached) return;
    startTransition(async () => {
      const result = await requestPhotoAccessAction(data.id);
      if (!result.unlimited) {
        setQuota((q) => ({ ...q, remaining: result.remaining }));
      }
    });
  }

  function expressInterest() {
    startTransition(async () => {
      await sendInterestAction(data.id);
    });
  }

  function openConversation() {
    startTransition(async () => {
      const id = await startConversation(data.id);
      if (id) router.push(`${locale === "en" ? "/en" : ""}/messages/${id}`);
    });
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
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
          />

          {/* Quota feedback — only while the photo is still gated */}
          {!photoRevealed && <QuotaNote quota={quota} />}

          <InterestAction
            state={viewer.interest}
            onExpress={expressInterest}
            pending={isPending}
          />

          {/* Matched users can chat + voice-call in-app (free, no Pro required). */}
          {viewer.isMatched && (
            <>
              <Button
                variant="secondary"
                fullWidth
                onClick={openConversation}
                disabled={isPending}
              >
                <ChatIcon width={18} height={18} />
                {t("message")}
              </Button>
              {canCall && (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => placeCall(data.id, data.displayName)}
                >
                  <PhoneIcon width={18} height={18} />
                  {t("call")}
                </Button>
              )}
            </>
          )}

          <CompletionMeter score={completion} />
        </div>

        {/* ---------- Right: identity + details ---------- */}
        <div className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-charcoal">
                {data.displayName}
              </h1>
              {data.isPro && (
                <Badge
                  variant="gold"
                  className="bg-gold text-white"
                  icon={<StarIcon width={14} height={14} />}
                >
                  {t("vip")}
                </Badge>
              )}
              {data.nameHidden && (
                <Badge variant="neutral" icon={<LockIcon width={14} height={14} />}>
                  {t("nameHidden")}
                </Badge>
              )}
              {data.isVerified && (
                <Badge
                  variant="verified"
                  icon={<ShieldCheckIcon width={14} height={14} />}
                >
                  {t("verified")}
                </Badge>
              )}
            </div>

            <p className="text-sm text-charcoal/60">
              {t.rich("ageLine", {
                age: String(data.age),
                gender: localize(data.gender, locale),
                upazila: localize(data.upazila, locale),
                district: localize(data.district, locale),
                n: (chunks) => (
                  <span className="font-sans font-semibold text-charcoal/80">
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

              <div className="mt-5 border-t border-charcoal/10 pt-4">
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
              <p className="text-sm leading-7 text-charcoal/80">{data.bio}</p>
            </CardBody>
          </Card>

          {/* Privacy-first: phone & email are never shown. Connect in-app. */}
          <PrivacyNote />

          {/* Trust & safety: report this profile */}
          <div className="flex justify-end pt-1">
            <ReportButton reportedUserId={data.id} />
          </div>
        </div>
      </div>

      {/* Full Details modal */}
      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={t("details.title")}
      >
        <dl className="divide-y divide-charcoal/10">
          <DetailRow label={t("details.height")} value={data.details.height} />
          <DetailRow label={t("details.weight")} value={data.details.weight} />
          <DetailRow
            label={t("details.children")}
            value={data.details.childrenStatus}
          />
          <DetailRow
            label={t("details.family")}
            value={data.details.family}
          />
        </dl>
      </Modal>
    </main>
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
      <span className="mt-0.5 text-trustGreen">{icon}</span>
      <div>
        <dt className="text-xs text-charcoal/50">{label}</dt>
        <dd className="text-sm font-medium text-charcoal">{value}</dd>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-charcoal/50">{label}</dt>
      <dd className="text-right text-sm font-medium text-charcoal">{value}</dd>
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
          <span className="text-xs text-charcoal/60">{t("completion")}</span>
          <span className="font-sans text-xs font-semibold text-trustGreen">
            {pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal/10">
          <div
            className="h-full rounded-full bg-trustGreen transition-all"
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
 * on-platform channels (in-app message + voice call).
 */
function PrivacyNote() {
  const t = useTranslations("Profile.privacyNote");
  return (
    <Card>
      <CardBody>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-trustGreen/10 text-trustGreen">
            <ShieldCheckIcon width={18} height={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-charcoal">{t("title")}</p>
            <p className="mt-0.5 text-sm text-charcoal/60">{t("body")}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
