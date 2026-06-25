/**
 * Mock data for the homepage profile showcase (VIP / New / Verified Professionals).
 * `profession` and `district` use the CANONICAL English values from
 * lib/constants so they localize correctly in both locales via `localize()`.
 * Names are free text; `nameHidden` profiles render a localized placeholder
 * (privacy-default). No real people — placeholder showcase only.
 */

export interface ShowcaseProfile {
  id: string;
  /** Omitted when nameHidden. */
  name?: string;
  nameHidden?: boolean;
  gender: "Male" | "Female";
  age: number;
  profession: string; // canonical (matches PROFESSIONS values)
  district: string; // canonical (matches DISTRICTS values)
  isMobileVerified: boolean;
  isPremium: boolean;
}

export type ShowcaseKey = "vip" | "new" | "professionals";

export interface ShowcaseSection {
  key: ShowcaseKey;
  profiles: ShowcaseProfile[];
}

export const SHOWCASE: ReadonlyArray<ShowcaseSection> = [
  {
    key: "vip",
    profiles: [
      { id: "v1", name: "Ayesha", gender: "Female", age: 27, profession: "Doctor", district: "Dhaka", isMobileVerified: true, isPremium: true },
      { id: "v2", nameHidden: true, gender: "Male", age: 31, profession: "Engineer", district: "Chattogram", isMobileVerified: true, isPremium: true },
      { id: "v3", name: "Tahmina", gender: "Female", age: 29, profession: "Banker", district: "Sylhet", isMobileVerified: true, isPremium: true },
      { id: "v4", name: "Rafiq", gender: "Male", age: 34, profession: "Business", district: "Dhaka", isMobileVerified: true, isPremium: true },
      { id: "v5", nameHidden: true, gender: "Female", age: 26, profession: "Lawyer", district: "Rajshahi", isMobileVerified: true, isPremium: true },
      { id: "v6", name: "Imran", gender: "Male", age: 33, profession: "IT/Software", district: "Khulna", isMobileVerified: true, isPremium: true },
    ],
  },
  {
    key: "new",
    profiles: [
      { id: "n1", name: "Sumaiya", gender: "Female", age: 24, profession: "Student", district: "Dhaka", isMobileVerified: true, isPremium: false },
      { id: "n2", name: "Hasan", gender: "Male", age: 28, profession: "Private Service", district: "Chattogram", isMobileVerified: false, isPremium: false },
      { id: "n3", nameHidden: true, gender: "Female", age: 25, profession: "Teacher", district: "Barishal", isMobileVerified: true, isPremium: false },
      { id: "n4", name: "Nayeem", gender: "Male", age: 30, profession: "Government Service", district: "Rangpur", isMobileVerified: true, isPremium: false },
      { id: "n5", name: "Farzana", gender: "Female", age: 27, profession: "Homemaker", district: "Sylhet", isMobileVerified: false, isPremium: false },
      { id: "n6", nameHidden: true, gender: "Male", age: 32, profession: "Expatriate", district: "Cumilla", isMobileVerified: true, isPremium: false },
    ],
  },
  {
    key: "professionals",
    profiles: [
      { id: "p1", name: "Dr. Nabila", gender: "Female", age: 30, profession: "Doctor", district: "Dhaka", isMobileVerified: true, isPremium: true },
      { id: "p2", name: "Arif", gender: "Male", age: 35, profession: "Engineer", district: "Chattogram", isMobileVerified: true, isPremium: false },
      { id: "p3", nameHidden: true, gender: "Female", age: 28, profession: "Banker", district: "Khulna", isMobileVerified: true, isPremium: false },
      { id: "p4", name: "Mahmud", gender: "Male", age: 38, profession: "Lawyer", district: "Rajshahi", isMobileVerified: true, isPremium: true },
      { id: "p5", name: "Sadia", gender: "Female", age: 31, profession: "IT/Software", district: "Dhaka", isMobileVerified: true, isPremium: false },
      { id: "p6", nameHidden: true, gender: "Male", age: 36, profession: "Defense/Police", district: "Sylhet", isMobileVerified: true, isPremium: false },
    ],
  },
];

/** Soft gradient hues, cycled per card index for the privacy-masked image area. */
export const SHOWCASE_HUES: readonly string[] = [
  "from-rose-200 to-rose-100",
  "from-emerald-200 to-emerald-100",
  "from-sky-200 to-sky-100",
  "from-amber-200 to-amber-100",
  "from-violet-200 to-violet-100",
  "from-teal-200 to-teal-100",
];
