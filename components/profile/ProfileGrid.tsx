import { ProfileCard } from "./ProfileCard";
import { PhotoQuotaProvider, QuotaBanner } from "@/components/billing/PhotoQuota";
import type { ProfileSummary } from "./types";
import type { PhotoQuota } from "@/lib/data/billing";

interface ProfileGridProps {
  profiles: ProfileSummary[];
  quota: PhotoQuota;
}

export function ProfileGrid({ profiles, quota }: ProfileGridProps) {
  return (
    <PhotoQuotaProvider initial={quota}>
      <QuotaBanner />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <ProfileCard key={profile.id} profile={profile} />
        ))}
      </div>
    </PhotoQuotaProvider>
  );
}
