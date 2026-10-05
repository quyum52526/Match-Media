import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const BLOG_LOCALES = ["bn", "en"] as const;
export type BlogLocale = (typeof BLOG_LOCALES)[number];

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle?: string;
  description: string;
  date: string;
  author: string;
  coverImage: string;
  tags: string[];
  keywords?: string[];
  translationKey: string;
  draft: boolean;
  content: string;
}

const requiredStringFields = [
  "title",
  "description",
  "date",
  "author",
  "coverImage",
  "translationKey",
] as const;

function parsePost(source: string, filePath: string, slug: string): BlogPost {
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
    author: data.author,
    coverImage: data.coverImage,
    tags: data.tags,
    keywords: data.keywords,
    translationKey: data.translationKey,
    draft: data.draft,
    content,
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
      return parsePost(source, filePath, slug);
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

export function blogPath(locale: BlogLocale, slug?: string): string {
  const pathName = slug ? `/blog/${slug}` : "/blog";
  return locale === "bn" ? pathName : `/en${pathName}`;
}
