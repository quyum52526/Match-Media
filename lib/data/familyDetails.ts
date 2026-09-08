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
 * Display-only — writes still go through the single free-text field. When the
 * schema eventually gains real columns for these, delete the heuristics below
 * and map the columns straight through; `FamilyBackground` stays the same.
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
