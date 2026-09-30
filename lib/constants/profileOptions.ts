/**
 * Standardized options for profile fields + search/filtering.
 *
 * IMPORTANT: `value` is the CANONICAL value stored in the DB (English, stable —
 * search queries depend on it). `bn` is the Bengali display label. The UI shows
 * `value` in English locale and `bn` in Bengali locale (see lib/constants/labels).
 * Numerals stay English in both locales.
 */

export interface Option {
  /** Canonical English value persisted to the DB. */
  value: string;
  /** Bengali display label. */
  bn: string;
}

export const GENDERS: readonly Option[] = [
  { value: "Male", bn: "পুরুষ" },
  { value: "Female", bn: "নারী" },
];

export const PROFESSIONS: readonly Option[] = [
  { value: "Student", bn: "ছাত্র/ছাত্রী" },
  { value: "Doctor", bn: "ডাক্তার" },
  { value: "Engineer", bn: "ইঞ্জিনিয়ার" },
  { value: "IT/Software", bn: "আইটি/সফটওয়্যার" },
  { value: "Teacher", bn: "শিক্ষক" },
  { value: "Banker", bn: "ব্যাংকার" },
  { value: "Government Service", bn: "সরকারি চাকরিজীবী" },
  { value: "Private Service", bn: "বেসরকারি চাকরিজীবী" },
  { value: "Business", bn: "ব্যবসায়ী" },
  { value: "Lawyer", bn: "আইনজীবী" },
  { value: "Defense/Police", bn: "সেনাবাহিনী/পুলিশ" },
  { value: "Agriculture", bn: "কৃষিকাজ" },
  { value: "Expatriate", bn: "প্রবাসী" },
  { value: "Homemaker", bn: "গৃহিণী" },
  { value: "Other", bn: "অন্যান্য" },
];

export const EDUCATION_LEVELS: readonly Option[] = [
  { value: "Primary", bn: "প্রাথমিক" },
  { value: "SSC/Equivalent", bn: "এসএসসি/সমমান" },
  { value: "HSC/Equivalent", bn: "এইচএসসি/সমমান" },
  { value: "Diploma", bn: "ডিপ্লোমা" },
  { value: "Bachelor's (Honours)", bn: "স্নাতক (সম্মান)" },
  { value: "Master's", bn: "স্নাতকোত্তর" },
  { value: "MBBS/Medical", bn: "এমবিবিএস/মেডিকেল" },
  { value: "Engineering", bn: "ইঞ্জিনিয়ারিং" },
  { value: "Madrasa", bn: "মাদ্রাসা (দাখিল/আলিম/ফাজিল/কামিল)" },
  { value: "PhD", bn: "পিএইচডি" },
  { value: "Other", bn: "অন্যান্য" },
];

export const RELIGIONS: readonly Option[] = [
  { value: "Islam", bn: "ইসলাম" },
  { value: "Hinduism", bn: "হিন্দু" },
  { value: "Buddhism", bn: "বৌদ্ধ" },
  { value: "Christianity", bn: "খ্রিস্টান" },
  { value: "Other", bn: "অন্যান্য" },
];

/**
 * Sects/denominations keyed by the canonical religion value. A religion absent
 * from this map (or with an empty list) simply has no sect selector — the UI
 * falls back to the free-text `caste` field. Values stay canonical English.
 */
export const SECTS_BY_RELIGION: Readonly<Record<string, readonly Option[]>> = {
  Islam: [
    { value: "Sunni", bn: "সুন্নি" },
    { value: "Shia", bn: "শিয়া" },
    { value: "Other", bn: "অন্যান্য" },
  ],
  Hinduism: [
    { value: "Brahmin", bn: "ব্রাহ্মণ" },
    { value: "Kayastha", bn: "কায়স্থ" },
    { value: "Vaishya", bn: "বৈশ্য" },
    { value: "Shudra", bn: "শূদ্র" },
    { value: "Other", bn: "অন্যান্য" },
  ],
  Buddhism: [
    { value: "Theravada", bn: "থেরবাদ" },
    { value: "Mahayana", bn: "মহাযান" },
    { value: "Other", bn: "অন্যান্য" },
  ],
  Christianity: [
    { value: "Catholic", bn: "ক্যাথলিক" },
    { value: "Protestant", bn: "প্রোটেস্ট্যান্ট" },
    { value: "Orthodox", bn: "অর্থোডক্স" },
    { value: "Other", bn: "অন্যান্য" },
  ],
};

/** Every sect across all religions — used to build the label map / validate. */
export const ALL_SECTS: readonly Option[] = Object.values(SECTS_BY_RELIGION)
  .flat()
  // "Other" repeats across religions; dedupe by value so the label map is flat.
  .filter((o, i, all) => all.findIndex((x) => x.value === o.value) === i);

/** The sects valid for a religion, or [] when the religion has none/unknown. */
export function sectsFor(religion: string | null | undefined): readonly Option[] {
  if (!religion) return [];
  return SECTS_BY_RELIGION[religion] ?? [];
}

export const DIETS: readonly Option[] = [
  { value: "Halal only", bn: "শুধু হালাল" },
  { value: "Vegetarian", bn: "নিরামিষভোজী" },
  { value: "Non-vegetarian", bn: "আমিষভোজী" },
  { value: "Eggetarian", bn: "ডিম-নিরামিষ" },
  { value: "Vegan", bn: "ভেগান" },
];

export const SMOKING_STATUSES: readonly Option[] = [
  { value: "Never", bn: "ধূমপান করি না" },
  { value: "Occasionally", bn: "মাঝে মাঝে" },
  { value: "Regularly", bn: "নিয়মিত" },
];

export const MARITAL_STATUSES: readonly Option[] = [
  { value: "Single", bn: "অবিবাহিত" },
  { value: "Married", bn: "বিবাহিত" },
  { value: "Divorced", bn: "তালাকপ্রাপ্ত" },
  { value: "Widow", bn: "বিধবা" },
  { value: "Widower", bn: "বিপত্নীক" },
];

/** All 64 districts of Bangladesh (canonical English names stored in DB). */
export const DISTRICTS: readonly string[] = [
  "Bagerhat","Bandarban","Barguna","Barishal","Bhola","Bogura","Brahmanbaria",
  "Chandpur","Chapai Nawabganj","Chattogram","Chuadanga","Cox's Bazar","Cumilla",
  "Dhaka","Dinajpur","Faridpur","Feni","Gaibandha","Gazipur","Gopalganj",
  "Habiganj","Jamalpur","Jessore","Jhalokathi","Jhenaidah","Joypurhat",
  "Khagrachhari","Khulna","Kishoreganj","Kurigram","Kushtia","Lakshmipur",
  "Lalmonirhat","Madaripur","Magura","Manikganj","Meherpur","Moulvibazar",
  "Munshiganj","Mymensingh","Naogaon","Narail","Narayanganj","Narsingdi",
  "Natore","Netrokona","Nilphamari","Noakhali","Pabna","Panchagarh","Patuakhali",
  "Pirojpur","Rajbari","Rajshahi","Rangamati","Rangpur","Satkhira","Shariatpur",
  "Sherpur","Sirajganj","Sunamganj","Sylhet","Tangail","Thakurgaon",
];

/** Heights from 4'6" to 6'5" in 1-inch steps (identical in both locales). */
export const HEIGHTS: readonly string[] = (() => {
  const out: string[] = [];
  for (let ft = 4; ft <= 6; ft++) {
    for (let inch = 0; inch <= 11; inch++) {
      if (ft === 4 && inch < 6) continue;
      if (ft === 6 && inch > 5) break;
      out.push(`${ft}'${inch}"`);
    }
  }
  return out;
})();

/**
 * Parse a height label like `5'6"` to a sortable total-inch index, or null when
 * unparseable. Heights are stored as strings, so string comparison is unsafe
 * (`5'10"` < `5'6"` lexically); convert to inches whenever ordering matters.
 */
export function heightToInches(height: string): number | null {
  const m = /^(\d+)'(\d+)"$/.exec(height.trim());
  if (!m) return null;
  return Number(m[1]) * 12 + Number(m[2]);
}

/**
 * The subset of HEIGHTS within the inclusive [min, max] inch range (each bound
 * optional). Returns canonical height strings so a query can match with
 * `{ in: [...] }`. An inverted range (min > max) yields [], i.e. matches none.
 */
export function heightsInRange(min?: string, max?: string): string[] {
  const lo = min ? heightToInches(min) : null;
  const hi = max ? heightToInches(max) : null;
  return HEIGHTS.filter((h) => {
    const inches = heightToInches(h);
    if (inches == null) return false;
    if (lo != null && inches < lo) return false;
    if (hi != null && inches > hi) return false;
    return true;
  });
}
