import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const BLOG_LOCALES = ["bn", "en"] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];

/** Average adult silent-reading speed used for the estimate. */
const WORDS_PER_MINUTE = 200;

export interface ReadingTime {
  minutes: number;
  /** Localized label, e.g. "৩ মিনিট পড়ার সময়" (bn) or "3 min read" (en). */
  label: string;
}

/**
 * Word-count reading time for a Markdown/MDX body. Code, image syntax, link
 * URLs and HTML/JSX tags are stripped first so only prose is counted. Bangla and English both separate words with whitespace.
 */
export function getReadingTime(
  content: string,
  locale: BlogLocale,
): ReadingTime {
  const prose = content
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/`[^`]*`/g, " ") // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → link text
    .replace(/<[^>]+>/g, " "); // HTML / JSX tags
  // Count only tokens with a letter or digit, so bare Markdown markers (#, -,
  // >, **) are skipped while hyphenated words stay one word.
  const words = prose
    .split(/\s+/)
    .filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  return {
    minutes,
    label:
      locale === "bn"
        ? `${new Intl.NumberFormat("bn-BD").format(minutes)} মিনিট পড়ার সময়`
        : `${minutes} min read`,
  };
}

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle?: string;
  description: string;
  date: string;
  /** Last substantive edit (YYYY-MM-DD); falls back to `date`. */
  updated?: string;
  author: string;
  coverImage: string;
  coverAlt?: string;
  tags: string[];
  keywords?: string[];
  translationKey: string;
  draft: boolean;
  content: string;
  readingTime: ReadingTime;
}

const requiredStringFields = [
  "title",
  "description",
  "date",
  "author",
  "coverImage",
  "translationKey",
] as const;

function parsePost(
  source: string,
  filePath: string,
  slug: string,
  locale: BlogLocale,
): BlogPost {
  const { data, content } = matter(source);

  for (const field of requiredStringFields) {
    if (typeof data[field] !== "string" || !data[field].trim()) {
      throw new Error(
        `Invalid blog post "${filePath}": missing or invalid required field "${field}".`,
      );
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error(
      `Invalid blog post "${filePath}": "date" must use YYYY-MM-DD format.`,
    );
  }
  const parsedDate = new Date(`${data.date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== data.date
  ) {
    throw new Error(
      `Invalid blog post "${filePath}": "date" must be a valid calendar date.`,
    );
  }

  if (
    !Array.isArray(data.tags) ||
    !data.tags.every((tag: unknown) => typeof tag === "string" && tag.trim())
  ) {
    throw new Error(
      `Invalid blog post "${filePath}": "tags" must be an array of non-empty strings.`,
    );
  }
  if (typeof data.draft !== "boolean") {
    throw new Error(
      `Invalid blog post "${filePath}": "draft" must be a boolean.`,
    );
  }

  if (
    data.metaTitle !== undefined &&
    (typeof data.metaTitle !== "string" || !data.metaTitle.trim())
  ) {
    throw new Error(
      `Invalid blog post "${filePath}": "metaTitle" must be a non-empty string when provided.`,
    );
  }

  if (
    data.coverAlt !== undefined &&
    (typeof data.coverAlt !== "string" || !data.coverAlt.trim())
  ) {
    throw new Error(
      `Invalid blog post "${filePath}": "coverAlt" must be a non-empty string when provided.`,
    );
  }

  if (
    data.updated !== undefined &&
    (typeof data.updated !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.updated))
  ) {
    throw new Error(
      `Invalid blog post "${filePath}": "updated" must be a YYYY-MM-DD string when provided.`,
    );
  }

  if (
    data.keywords !== undefined &&
    (!Array.isArray(data.keywords) ||
      !data.keywords.every(
        (keyword: unknown) => typeof keyword === "string" && keyword.trim(),
      ))
  ) {
    throw new Error(
      `Invalid blog post "${filePath}": "keywords" must be an array of non-empty strings when provided.`,
    );
  }

  return {
    slug,
    title: data.title,
    metaTitle: data.metaTitle,
    description: data.description,
    date: data.date,
    updated: data.updated,
    author: data.author,
    coverImage: data.coverImage,
    coverAlt: data.coverAlt,
    tags: data.tags,
    keywords: data.keywords,
    translationKey: data.translationKey,
    draft: data.draft,
    content,
    readingTime: getReadingTime(content, locale),
  };
}

async function readPosts(locale: BlogLocale): Promise<BlogPost[]> {
  const directory = path.join(process.cwd(), "content", "blog", locale);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Unable to read blog content directory "${directory}".`, {
      cause: error,
    });
  }

  const markdownFiles = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".md"),
  );
  const posts = await Promise.all(
    markdownFiles.map(async (entry) => {
      const slug = entry.name.slice(0, -3);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        throw new Error(
          `Invalid blog post filename "${entry.name}" in "${directory}": use a lowercase, hyphen-separated slug.`,
        );
      }

      const filePath = path.join(directory, entry.name);
      const source = await readFile(filePath, "utf8");
      return parsePost(source, filePath, slug, locale);
    }),
  );

  const translationKeys = new Set<string>();
  for (const post of posts) {
    if (translationKeys.has(post.translationKey)) {
      throw new Error(
        `Duplicate blog translationKey "${post.translationKey}" in locale "${locale}".`,
      );
    }
    translationKeys.add(post.translationKey);
  }

  return posts;
}

export async function getAllPosts(locale: BlogLocale): Promise<BlogPost[]> {
  return (await readPosts(locale))
    .filter((post) => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getPost(
  locale: BlogLocale,
  slug: string,
): Promise<BlogPost | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const posts = await getAllPosts(locale);
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getTranslation(
  translationKey: string,
  otherLocale: BlogLocale,
): Promise<BlogPost | null> {
  const posts = await getAllPosts(otherLocale);
  return posts.find((post) => post.translationKey === translationKey) ?? null;
}

/**
 * Up to `limit` other published posts in the same locale: posts sharing the
 * most tags first (case-insensitive; newest wins ties), then topped up with
 * the latest posts. The current post is always excluded.
 */
export async function getRelatedPosts(
  post: BlogPost,
  locale: BlogLocale,
  limit = 3,
): Promise<BlogPost[]> {
  const tags = new Set(post.tags.map((tag) => tag.toLowerCase()));
  // getAllPosts is newest-first, so stable sorts keep date order within ties.
  const others = (await getAllPosts(locale)).filter(
    (p) => p.slug !== post.slug,
  );
  const shared = (p: BlogPost) =>
    p.tags.filter((tag) => tags.has(tag.toLowerCase())).length;

  const related = others
    .filter((p) => shared(p) > 0)
    .sort((a, b) => shared(b) - shared(a))
    .slice(0, limit);
  for (const p of others) {
    if (related.length >= limit) break;
    if (!related.includes(p)) related.push(p);
  }
  return related;
}

export function blogPath(locale: BlogLocale, slug?: string): string {
  const pathName = slug ? `/blog/${slug}` : "/blog";
  return locale === "bn" ? pathName : `/en${pathName}`;
}
