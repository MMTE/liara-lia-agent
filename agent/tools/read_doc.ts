import { defineTool } from "eve/tools";
import { z } from "zod";
import { readDoc } from "../../src/lib/docs-index";

export default defineTool({
  description:
    "Read the full text of one documentation page by its slug (as returned by search_docs). Use when a snippet is not enough to answer precisely — e.g. step-by-step deployment procedures, exact limits, or full request/response schemas.",
  inputSchema: z.object({
    slug: z.string().min(1).describe("Page slug from search_docs results, e.g. 'paas/laravel/quick-start'"),
  }),
  async execute({ slug }) {
    const text = readDoc(slug);
    if (text === null) {
      return { error: "not_found", hint: "Unknown slug. Call search_docs first and use its returned slugs." };
    }
    return { slug, text };
  },
});
