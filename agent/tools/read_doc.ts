import { defineTool } from "eve/tools";
import { z } from "zod";
import { readDoc } from "../../src/lib/docs-index";

export default defineTool({
  description:
    "Read the full text of one documentation page by its slug (as returned by search_docs). Use when a snippet is not enough to answer precisely — e.g. step-by-step deployment procedures, exact limits, or full request/response schemas. Each block in the returned text ends with a `{#section-id}` marker: that is the page section the block belongs to — cite it as `url + '#' + section-id` so the user lands on the exact section.",
  inputSchema: z.object({
    slug: z.string().min(1).describe("Page slug from search_docs results, e.g. 'paas/laravel/quick-start'"),
  }),
  async execute({ slug }) {
    const doc = readDoc(slug);
    if (doc === null) {
      return { error: "not_found", hint: "Unknown slug. Call search_docs first and use its returned slugs." };
    }
    return {
      slug,
      url: doc.url,
      // deepest anchor of the first block — prefer per-block {#id} markers
      anchor: doc.anchor,
      deepUrl: doc.anchor ? `${doc.url}#${doc.anchor}` : doc.url,
      text: doc.text,
    };
  },
});
