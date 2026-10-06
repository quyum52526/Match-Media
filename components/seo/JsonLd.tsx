import type { JsonLdSchema } from "@/lib/seo/schema";

/**
 * Server-rendered JSON-LD script. `<` is escaped so content can never close the
 * script tag early. Pass an array to emit several nodes in one tag.
 */
export function JsonLd({ data }: { data: JsonLdSchema | JsonLdSchema[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
