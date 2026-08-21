---
name: docs-research
description: Search and read Liara documentation effectively — bilingual queries, when to read full pages, and how to cite.
---

# Docs research

## Searching

- Persian queries for product concepts, plans, pricing, how-tos:
  «پلن‌ها», «اتصال دیتابیس», «گواهی SSL».
- English identifiers for API details: endpoint paths, operationIds
  (updateEnvs, releasesDeploy), parameter names. The corpus includes the
  English API reference (developers.liara.ir).
- If the first query returns weak results, reformulate once or twice:
  swap language, use the platform name (Laravel/Django/Flask), or use the
  error text verbatim.
- Two focused searches beat one vague one.

## Reading

- Use `read_doc` when: the snippet cuts off mid-procedure, the question needs
  exact limits/numbers, or the user asks for a complete guide.
- Do NOT read_doc every hit — snippets answer most questions (token budget).

## Citing

- Every factual Liara claim carries its source URL. Collect them as you go
  and list under «منابع» with page titles.
- If nothing relevant is found after 2–3 reformulations: say «مطمئن نیستم»,
  describe what you searched, and point to docs.liara.ir search. Never
  fabricate features, limits, or prices.

## Answer shape

Direct answer first, then details/code, then «منابع», then «قدم بعدی»
when action is implied.
