import type { FamilyBackground } from "@/components/profile/types";

/**
 * Family background parsing.
 *
 * The DB stores family info as ONE free-text column (`Profile.familyDetails`),
 * because that is what the edit form collects. The Full Details modal, however,
 * shows it as discrete rows (status / father / mother / siblings / values).
 * This module bridges the two: it segments the stored text into those fields
 * and keeps whatever it cannot classify as a plain note, so nothing is lost.
 *
 * The schema now has real columns for most of this (fatherProfession,
 * numberOfBrothers, familyType, …). New writes go there; the heuristics below
 * exist only so profiles written before those columns still render as rows.
 * `buildFamilyBackground()` layers the columns on top of the parsed text.
 */

/** Redundant lead-ins to drop, e.g. "Family Details: বাবা ব্যবসায়ী". */
const LABEL_PREFIX =
  /^\s*(family\s*(details|background|info(rmation)?)|পারিবারিক\s*(তথ্য|পরিচয়)|পরিবার(ের)?\s*(তথ্য|বিবরণ)?)\s*[:：\-–—]\s*/i;

/** Explicit "Label: value" keys, EN + BN. */
const FIELD_LABELS: [RegExp, keyof FamilyBackground][] = [
  [/^(family\s*status|পরিবারের?\s*ধরন|পরিবার)$/i, "status"],
  [/^(father(['’]s)?(\s*(profession|occupation))?|বাবা(র)?|পিতা(র)?)$/i, "fatherProfession"],
  [/^(mother(['’]s)?(\s*(profession|occupation))?|মা(য়ের)?|মাতা(র)?)$/i, "motherProfession"],
  [/^(siblings?|number\s+of\s+siblings?|brothers?\s*(&|and)?\s*sisters?|ভাইবোন|ভাই[-\s]*বোন)$/i, "siblings"],
  [/^(family\s*values?|values?|পারিবারিক\s*মূল্যবোধ|মূল্যবোধ)$/i, "values"],
];

/**
 * "বাবা-মা প্রয়াত" names both parents — never one parent's profession.
 * NOTE: no `\b` here; JS word boundaries are ASCII-only and never fire after
 * a Bengali letter, which silently defeated this guard.
 */
const BOTH_PARENTS = /^(বাবা[-\s]*(ও\s*)?মা|মা[-\s]*(ও\s*)?বাবা|parents(?![a-z]))/i;

/** Prefix keywords for label-less prose ("বাবা ব্যবসায়ী"). */
const PARENT_PREFIX: [RegExp, keyof FamilyBackground][] = [
  [/^(বাবা|পিতা|father)\s*(?:is|:|[-–—])?\s*/i, "fatherProfession"],
  [/^(মা|মাতা|mother)\s*(?:is|:|[-–—])?\s*/i, "motherProfession"],
];

const SIBLING_WORDS = /(ভাইবোন|ভাই|বোন|siblings?|brother|sister)/i;
const STATUS_WORDS = /(যৌথ\s*পরিবার|একক\s*পরিবার|joint\s*family|nuclear\s*family)/i;
const VALUE_WORDS = /(মূল্যবোধ|ধর্মভীরু|ধার্মিক|রক্ষণশীল|উদারপন্থী|religious|conservative|liberal|values)/i;

/** Strong separators: list punctuation, plus a full stop before a "Label:". */
const HARD_SPLIT = /[;।\n]|(?<=\.)\s+(?=[^\s:：]{1,28}\s*[:：])/g;

/** A segment that opens with its own short "Label:". */
const LABELLED = /^[^:：]{1,28}[:：]/;

/**
 * Split the blurb into one segment per fact.
 *
 * Commas are only a separator inside UNLABELLED prose ("বাবা ব্যবসায়ী, মা
 * গৃহিণী"). Inside a labelled segment they belong to the value itself
 * ("ভাইবোন: এক ভাই, এক বোন"), so that segment is kept whole.
 */
function segments(text: string): string[] {
  return text
    .split(HARD_SPLIT)
    .flatMap((part) => (LABELLED.test(part.trim()) ? [part] : part.split(/,\s*/g)))
    .map((s) => s.trim().replace(/[।.]+$/, "").trim())
    .filter(Boolean);
}

/**
 * Turn the stored free-text family blurb into labelled fields.
 *
 * Classification is intentionally conservative: a segment only becomes a field
 * when it carries an explicit label or an unambiguous keyword. Everything else
 * lands in `note`, so the modal can still show it verbatim.
 */
export function parseFamilyDetails(raw: string | null | undefined): FamilyBackground {
  const text = (raw ?? "").trim();
  const family: FamilyBackground = { raw: text };
  if (!text) return family;

  const leftovers: string[] = [];

  for (const segment of segments(text.replace(LABEL_PREFIX, ""))) {
    // 1. Explicit "Label: value".
    const labelled = segment.match(/^([^:：]{1,28})[:：]\s*(.+)$/);
    if (labelled) {
      const key = FIELD_LABELS.find(([re]) => re.test(labelled[1].trim()))?.[1];
      if (key && key !== "raw" && key !== "note") {
        family[key] = labelled[2].trim();
        continue;
      }
    }

    // 2. Label-less prose, most specific test first.
    if (BOTH_PARENTS.test(segment)) {
      leftovers.push(segment);
      continue;
    }
    const parent = PARENT_PREFIX.find(([re]) => re.test(segment));
    if (parent) {
      const value = segment.replace(parent[0], "").trim();
      // A bare "বাবা" with nothing after it says nothing — keep it as a note.
      if (value) {
        family[parent[1]] = value;
        continue;
      }
    }
    if (SIBLING_WORDS.test(segment) && !family.siblings) {
      family.siblings = segment;
      continue;
    }
    if (STATUS_WORDS.test(segment) && !family.status) {
      family.status = segment;
      continue;
    }
    if (VALUE_WORDS.test(segment) && !family.values) {
      family.values = segment;
      continue;
    }
    leftovers.push(segment);
  }

  if (leftovers.length) family.note = leftovers.join("। ");
  return family;
}

/** The structured family columns of a `Profile` row. */
export interface FamilyColumns {
  familyDetails: string | null;
  fatherProfession: string | null;
  fatherStatus: string | null;
  motherProfession: string | null;
  motherStatus: string | null;
  numberOfBrothers: number | null;
  brothersDetails: string | null;
  numberOfSisters: number | null;
  sistersDetails: string | null;
  paternalBackground: string | null;
  maternalBackground: string | null;
  familyClass: string | null;
  familyType: string | null;
}

function text(v: string | null | undefined): string | undefined {
  const s = (v ?? "").trim();
  return s || undefined;
}

function count(v: number | null | undefined): string | undefined {
  return v === null || v === undefined ? undefined : String(v);
}

/**
 * The family background to display: the structured columns, falling back to
 * whatever can still be recovered from the legacy free-text blurb.
 *
 * Columns always win — a member who filled the real fields never sees a guess
 * from their old prose contradicting them. When structured sibling counts
 * exist, the parsed `siblings` sentence is dropped so the modal doesn't show
 * the same fact twice.
 */
export function buildFamilyBackground(p: FamilyColumns): FamilyBackground {
  const parsed = parseFamilyDetails(p.familyDetails);

  const family: FamilyBackground = {
    ...parsed,
    fatherProfession: text(p.fatherProfession) ?? parsed.fatherProfession,
    fatherStatus: text(p.fatherStatus),
    motherProfession: text(p.motherProfession) ?? parsed.motherProfession,
    motherStatus: text(p.motherStatus),
    brothers: count(p.numberOfBrothers),
    brothersDetails: text(p.brothersDetails),
    sisters: count(p.numberOfSisters),
    sistersDetails: text(p.sistersDetails),
    paternalBackground: text(p.paternalBackground),
    maternalBackground: text(p.maternalBackground),
    familyClass: text(p.familyClass),
    familyType: text(p.familyType),
  };

  if (family.brothers || family.sisters || family.brothersDetails || family.sistersDetails) {
    family.siblings = undefined;
  }
  // `status` was the legacy joint/nuclear guess — the real column replaces it.
  if (family.familyType) family.status = undefined;

  return family;
}

/**
 * Whether a profile says anything at all about its family, through either the
 * structured columns or the free-text note. Used by the completion score so
 * filling the new fields counts, even with the old textarea left empty.
 */
export function hasFamilyInfo(p: Partial<FamilyColumns>): boolean {
  return [
    p.familyDetails,
    p.fatherProfession,
    p.fatherStatus,
    p.motherProfession,
    p.motherStatus,
    p.brothersDetails,
    p.sistersDetails,
    p.paternalBackground,
    p.maternalBackground,
    p.familyClass,
    p.familyType,
  ].some((v) => Boolean(v && String(v).trim())) ||
    p.numberOfBrothers != null ||
    p.numberOfSisters != null;
}
