"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireViewerId } from "@/lib/session";
import {
  MAX_DOC_BYTES,
  uploadVerificationDoc,
} from "@/lib/storage/verificationDocs";
import { DISTRICTS } from "@/lib/constants/bdGeo";

/**
 * A member applying to take on a SECOND role from their existing login:
 * marriage-media agency, or verification agent.
 *
 * Nothing here grants anything. Each action only records a PENDING application
 * with its documents; an admin approves it (lib/actions/adminRoleApplications.ts),
 * and only that approval sets the flag the context switcher and the dashboards
 * read. A second account is never created, so the unique email/mobile on User
 * cannot collide.
 */

export type ApplicationResult = { ok: true } | { ok: false; error: string };

const EXPAND = "/[locale]/profile/expand";
const PROFILE_EDIT = "/[locale]/profile/edit";

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function fileField(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

/** Documents must be an image or a PDF — a trade licence is often scanned. */
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function checkDoc(file: File | null, label: string): string | null {
  if (!file) return `${label} is required.`;
  if (file.size > MAX_DOC_BYTES) return `${label} must be under 5 MB.`;
  if (file.type && !ALLOWED_TYPES.includes(file.type)) {
    return `${label} must be a JPG, PNG, WebP or PDF file.`;
  }
  return null;
}

/**
 * Refuse a second application while one is already being reviewed, and refuse
 * one for a role the account already holds. Both are checked server-side: the
 * UI hides the form in those states, but the action is the authority.
 */
async function assertCanApply(
  userId: string,
  role: "AGENCY" | "AGENT",
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hasAgency: true, hasAgentRole: true },
  });
  if (!user) return "Please log in again.";

  if (role === "AGENCY") {
    if (user.hasAgency) return "Your account already operates an agency.";
    const pending = await prisma.agencyApplication.findFirst({
      where: { userId, status: "PENDING" },
      select: { id: true },
    });
    if (pending) return "Your agency application is already under review.";
    return null;
  }

  if (user.hasAgentRole) return "Your account is already a verification agent.";
  const pending = await prisma.agentApplication.findFirst({
    where: { userId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) return "Your agent application is already under review.";
  return null;
}

/**
 * Apply to run a marriage-media agency.
 *
 * Full name and mobile are NOT read from the form: the application belongs to
 * the signed-in account, and those values are already on it (the form shows
 * them locked for the same reason). Taking them from the submission would let a
 * crafted POST apply under someone else's identity.
 */
export async function applyForAgency(
  formData: FormData,
): Promise<ApplicationResult> {
  const userId = await requireViewerId("/login");

  const blocked = await assertCanApply(userId, "AGENCY");
  if (blocked) return { ok: false, error: blocked };

  const agencyName = field(formData, "agencyName");
  const tradeLicenseNumber = field(formData, "tradeLicenseNumber");
  const officeAddress = field(formData, "officeAddress");
  if (!agencyName) return { ok: false, error: "Agency name is required." };
  if (!tradeLicenseNumber) {
    return { ok: false, error: "Trade licence number is required." };
  }
  if (!officeAddress) return { ok: false, error: "Office address is required." };

  const licence = fileField(formData, "tradeLicenseDocument");
  const docError = checkDoc(licence, "Trade licence document");
  if (docError) return { ok: false, error: docError };

  // The contact name is snapshotted from the account, not the form.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { contactPerson: true, profile: { select: { fullName: true } } },
  });
  const contactPerson =
    user?.contactPerson?.trim() || user?.profile?.fullName?.trim() || "";

  let tradeLicenseDocumentKey: string;
  try {
    tradeLicenseDocumentKey = await uploadVerificationDoc(
      userId,
      "agency-license",
      licence!,
    );
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }

  await prisma.agencyApplication.create({
    data: {
      userId,
      agencyName,
      tradeLicenseNumber,
      tradeLicenseDocumentKey,
      officeAddress,
      contactPerson,
    },
  });

  revalidatePath(EXPAND, "page");
  revalidatePath(PROFILE_EDIT, "page");
  revalidatePath("/", "layout"); // the header switcher shows the pending row
  return { ok: true };
}

/** Apply to work as a verification agent. */
export async function applyForAgent(
  formData: FormData,
): Promise<ApplicationResult> {
  const userId = await requireViewerId("/login");

  const blocked = await assertCanApply(userId, "AGENT");
  if (blocked) return { ok: false, error: blocked };

  const nidNumber = field(formData, "nidNumber");
  if (!nidNumber) return { ok: false, error: "NID number is required." };
  // 10, 13 and 17 digits are the NID formats in circulation.
  if (!/^\d{10}$|^\d{13}$|^\d{17}$/.test(nidNumber.replace(/\s/g, ""))) {
    return { ok: false, error: "Enter a valid NID number (10, 13 or 17 digits)." };
  }

  // Canonical district values only — a free-text area would never match the
  // district filters that assignments are routed by.
  const submitted = formData.getAll("operatingDistricts").map((d) => String(d));
  const operatingDistricts = submitted.filter((d) =>
    DISTRICTS.some((o) => o.value === d),
  );
  if (!operatingDistricts.length) {
    return { ok: false, error: "Select at least one operating district." };
  }

  const front = fileField(formData, "nidFront");
  const back = fileField(formData, "nidBack");
  const police = fileField(formData, "policeVerification");
  for (const [file, label] of [
    [front, "NID front image"],
    [back, "NID back image"],
  ] as const) {
    const error = checkDoc(file, label);
    if (error) return { ok: false, error };
  }
  // Police verification is optional, but must still be a sane file when given.
  if (police) {
    const error = checkDoc(police, "Police verification document");
    if (error) return { ok: false, error };
  }

  let nidFrontKey: string, nidBackKey: string;
  let policeVerificationKey: string | null = null;
  try {
    [nidFrontKey, nidBackKey] = await Promise.all([
      uploadVerificationDoc(userId, "agent-nid-front", front!),
      uploadVerificationDoc(userId, "agent-nid-back", back!),
    ]);
    if (police) {
      policeVerificationKey = await uploadVerificationDoc(
        userId,
        "agent-police-verification",
        police,
      );
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Upload failed.",
    };
  }

  await prisma.agentApplication.create({
    data: {
      userId,
      nidNumber,
      nidFrontKey,
      nidBackKey,
      policeVerificationKey,
      operatingDistricts,
    },
  });

  revalidatePath(EXPAND, "page");
  revalidatePath(PROFILE_EDIT, "page");
  revalidatePath("/", "layout");
  return { ok: true };
}
