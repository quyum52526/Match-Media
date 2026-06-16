import { ProfileCard } from "./ProfileCard";
import type { ProfileSummary } from "./types";

interface ProfileGridProps {
  profiles: ProfileSummary[];
}

export function ProfileGrid({ profiles }: ProfileGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} />
      ))}
    </div>
  );
}
