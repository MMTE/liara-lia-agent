import { defineOpenAPIConnection } from "eve/connections";

import aiModelsSpec from "../specs/ai-models.json";

/**
 * Liara AI public model catalog. No auth (verified live 2026-08-22) —
 * read-only, GET-only, so no approval gating applies.
 */
export default defineOpenAPIConnection({
  spec: aiModelsSpec,
  description:
    "Liara AI model catalog (کاتالوگ مدل‌ها): all models available on Liara AI with full details (v1 list + single model by ID), plus the paginated v2 list with filter/sort/search. No authentication required — use it to answer which models exist, their capabilities, pricing, and context limits.",
});
