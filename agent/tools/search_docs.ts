import { defineTool } from "eve/tools";
import { z } from "zod";
import { searchDocs } from "../../src/lib/docs-index";

export default defineTool({
  description:
    "Search Liara's documentation (Persian product guides at docs.liara.ir + English API reference at developers.liara.ir). Returns snippets with source URLs. Use this FIRST for every Liara how-to, concept, limit, pricing, or API question — and cite the returned URLs in your answer under «منابع».",
  inputSchema: z.object({
    query: z
      .string()
      .min(2)
      .describe(
        "Search query. Use Persian for product/guide topics; use English identifiers (endpoint, operationId like updateEnvs) for API details. Both are searched."
      ),
  }),
  async execute({ query }) {
    const results = await searchDocs(query, 6);
    return {
      query,
      resultCount: results.length,
      results: results.map((r) => ({
        title: r.title,
        url: r.url,
        slug: r.slug,
        source: r.source,
        snippet: r.snippet,
      })),
      hint:
        results.length === 0
          ? "No documents matched. Try reformulating (fa/en), or use read_doc with a known slug."
          : undefined,
    };
  },
});
