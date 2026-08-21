# Liri — UI Prototype

Interactive prototype of the **Liri assistant experience** («لیری، دستیار عملیاتی لیارا»).
Built with Magic Patterns (Vite + React 18 + Tailwind 3 + framer-motion), scripted with
mock data — no backend. It defines the target UI for the production Next.js app in this
repo (`src/`); behavior gets ported onto the real Eve agent (`agent/`).

## Run

```bash
npm install
npm run dev   # http://localhost:5173
```

## What it demonstrates

Two surfaces (bottom tab switcher) with one shared floating assistant:

- **مستندات لیارا** — docs.liara.ir replica: sidebar, article view, code blocks with copy,
  ⌘K «search or ask Liri» bar, per-article «ask Liri» buttons.
- **کنسول لیارا (افزونه کروم)** — console replica for app `my-api` (production, failed
  deployment #۱۸۴): config card, connected resources, quick-action buttons.

Assistant loop (matches the real agent loop: understand → inspect → diagnose → plan →
approve → act → verify):

| Interaction | Where to see it |
|---|---|
| Mascot bubble + proactive nudge | Switch to console surface, wait ~4s → «استقرار ‎#۱۸۴ … شکست خورده است. بررسی کنم؟» |
| Tool trace with typed tools | Any scenario — steps labeled `get_deployment`, `get_build_logs`, `search_docs`… with expandable raw output |
| Cited answer card | Evidence bullets, code block, clickable citations that open the doc in the docs surface |
| Clarify question | Type «برای برنامه‌ام دیتابیس می‌خواهم» → option buttons with hints |
| Change plan + approval | After diagnose: numbered changes, before→after diff, risk badge (نیازمند تأیید / بی‌خطر), «تأیید و اجرا» / «انصراف» |
| Verify run + success | After approving: watch_deployment steps → «برنامه my-api دوباره سالم است» |
| Proactive follow-up + suggestions | Post-fix health-check offer; suggestion chips under the answer |
| Activity timeline | Panel header «فعالیت» tab |

## Structure

```
src/
├── App.tsx                  # surface switch + context wiring + nudge logic
├── pages/                   # Docs · Dashboard (console replica)
├── components/
│   ├── liri/                # assistant: Liri (bubble/nudge), LiriPanel, HomeState,
│   │                        #   ToolTrace, AnswerCard, PlanCard, RunCard, ClarifyCard,
│   │                        #   ActivityView, Mascot
│   ├── docs/                # DocsHeader, DocsSidebar, ArticleView
│   └── CodeBlock.tsx
├── hooks/useLiri.ts         # scripted agent state machine (ask/clarify/approve/reject)
├── data/
│   ├── scenarios.ts         # 5 scripted runs + free-text matcher
│   └── docs.ts              # mock article corpus
├── types/                   # agent.ts (Message/Scenario/Plan…), context.ts
└── _designSystem/           # Magic Patterns shadcn token set (kept for the port)
```

Types in `types/agent.ts` are the contract worth preserving when porting:
`Message` (user | text | trace | answer | plan | run | clarify | proactive),
`ToolStep {label, tool, kind: read|docs|write, result, output}`, `AgentPlan` +
`PlanChange.risk`, `Citation {title, path, section}`, `Mood`, `LiriContext` per surface.

## Port notes (to production Next.js app)

- Replace `useLiri`'s scripted scenarios with the Eve agent's streaming events
  (`agent/`); keep the message-type union as the UI contract.
- `PlanCard` maps to Eve's HITL approval; `RunCard` to post-approval tool runs.
- Quick actions + proactive nudges come from `LiriContext`; the dashboard surface
  becomes the Chrome extension / embed mode (`extension/`, embed route).
- The mock docs corpus (`data/docs.ts`) is replaced by the real one
  (`src/data/docs-chunks.json`, 1,142 pages).
