"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { BlogModal, type BlogPost } from "./BlogModal";

/**
 * Blog card list. Clicking a card opens the full article in a BlogModal
 * instead of navigating to a separate page — selection state lives here.
 */
export function BlogList({
  posts,
  readMoreLabel,
}: {
  posts: BlogPost[];
  readMoreLabel: string;
}) {
  const [selected, setSelected] = useState<BlogPost | null>(null);

  return (
    <>
      <div className="space-y-4">
        {posts.map((post) => (
          <Card
            key={post.title}
            className="transition-shadow duration-150 hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => setSelected(post)}
              className="block w-full text-left"
            >
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
                  {post.date}
                </p>
                <h2 className="mt-1 text-base font-semibold text-ink">
                  {post.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                  {post.excerpt}
                </p>
                <span className="mt-3 inline-block text-sm font-medium text-primary">
                  {readMoreLabel} →
                </span>
              </CardBody>
            </button>
          </Card>
        ))}
      </div>

      <BlogModal post={selected} onClose={() => setSelected(null)} />
    </>
  );
}
