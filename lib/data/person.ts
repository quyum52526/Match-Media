import "server-only";
import { calcAge } from "@/lib/utils";
import { HIDDEN_NAME } from "./profiles";
import type { RequestPerson } from "@/components/requests/types";

/** Profile fields needed to render a RequestPerson card. */
export const personProfileSelect = {
  fullName: true,
  nameHidden: true,
  dateOfBirth: true,
  district: true,
  upazila: true,
  isVerified: true,
} as const;

export type CounterpartUser = {
  id: string;
  profile: {
    fullName: string | null;
    nameHidden: boolean;
    dateOfBirth: Date;
    district: string | null;
    upazila: string | null;
    isVerified: boolean;
  } | null;
};

/** Map a counterpart user (+ profile) to a presentation-ready person. */
export function toRequestPerson(user: CounterpartUser): RequestPerson | null {
  const p = user.profile;
  if (!p) return null;
  return {
    id: user.id,
    displayName: p.nameHidden || !p.fullName ? HIDDEN_NAME : p.fullName,
    nameHidden: p.nameHidden,
    age: calcAge(p.dateOfBirth),
    district: p.district ?? "",
    upazila: p.upazila ?? "",
    isVerified: p.isVerified,
  };
}
