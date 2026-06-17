/**
 * Standardized option arrays for profile fields + search/filtering.
 * IMPORTANT: keep these VALUES stable — both the edit form and the (future)
 * search queries depend on them, so changing a value silently breaks filters.
 * Data values are Bengali by project convention; numerals stay English.
 */

export const PROFESSIONS = [
  "ছাত্র/ছাত্রী",
  "ডাক্তার",
  "ইঞ্জিনিয়ার",
  "আইটি/সফটওয়্যার",
  "শিক্ষক",
  "ব্যাংকার",
  "সরকারি চাকরিজীবী",
  "বেসরকারি চাকরিজীবী",
  "ব্যবসায়ী",
  "আইনজীবী",
  "সেনাবাহিনী/পুলিশ",
  "কৃষিকাজ",
  "প্রবাসী",
  "গৃহিণী",
  "অন্যান্য",
] as const;

export const EDUCATION_LEVELS = [
  "প্রাথমিক",
  "এসএসসি/সমমান",
  "এইচএসসি/সমমান",
  "ডিপ্লোমা",
  "স্নাতক (সম্মান)",
  "স্নাতকোত্তর",
  "এমবিবিএস/মেডিকেল",
  "ইঞ্জিনিয়ারিং",
  "মাদ্রাসা (দাখিল/আলিম/ফাজিল/কামিল)",
  "পিএইচডি",
  "অন্যান্য",
] as const;

export const MARITAL_STATUSES = [
  "অবিবাহিত",
  "বিবাহিত",
  "তালাকপ্রাপ্ত",
  "বিধবা",
  "বিপত্নীক",
] as const;

/** Heights from 4'6" to 6'5" in 1-inch steps (English numerals). */
export const HEIGHTS: string[] = (() => {
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
