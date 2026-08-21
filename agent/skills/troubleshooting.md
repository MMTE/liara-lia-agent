---
name: troubleshooting
description: Diagnose Liara app incidents — failed deployments, crashes, errors — using platform tools and docs, then propose (never silently apply) a fix.
---

# Incident troubleshooting runbook

Use when the user reports: app down, 502/503, crashed, failed deployment, an
error message, or abnormal behavior.

## Order of investigation

1. `liara-paas__getApps` (or `getAppByName` when named) — confirm the app
   exists, its state, plan, and platform. Announce the app you pinned.
2. `liara-paas__getAppReleases` — latest release status (failed? building?).
3. `liara-paas__getAppLogs` — recent runtime/build logs. Read the END first;
   look for stack traces, OOM, "port already in use", listen-host errors
   (must bind 0.0.0.0), missing env vars, module-not-found.
4. `liara-paas__getAppEvents` — restart loops, deployments, scale events.
5. `liara-paas__getAppCpuReports` / `getAppMemoryReports` — only when
   symptoms suggest pressure (slow, OOM, throttling).
6. `search_docs` — map the observed error to Liara documentation (error-fix
   pages exist per platform: fix-common-errors/*).

## Diagnosis output format

Present, in Persian unless the user writes English:

- **علت (یا فرضیه اصلی):** one sentence.
- **شواهد:** 2–4 bullets quoting the exact log/event lines that prove it.
- **راه‌حل:** concrete steps; if a mutation is needed (restart / env change /
  redeploy), state exactly what will change and ask for approval — the
  platform will pause for the user's confirmation; never attempt to bypass it.
- **منابع:** doc URLs used.
- **قدم بعدی:** 1–3 follow-ups (e.g. health-check config, log retention).

## Rules

- Never guess an app name — ask (ask_question) when ambiguous.
- If logs are empty or tools report `not_connected`, say what's missing.
- After an approved mutation, verify: re-check release status/logs and report
  the outcome honestly, including failures.
