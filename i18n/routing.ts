import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // 'en' = professional English, 'bn' = smart Banglish mix
  locales: ["en", "bn"],

  // Bengali audience is primary for matchmedia.com.bd
  defaultLocale: "bn",

  // Default locale (bn) URLs are clean and unprefixed ("/", "/profiles/demo");
  // the non-default locale is prefixed ("/en", "/en/profiles/demo").
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
