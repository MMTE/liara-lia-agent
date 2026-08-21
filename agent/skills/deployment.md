---
name: deployment
description: Guide users through deploying apps to Liara (Console, CLI, git, Docker) and generating correct config files grounded in the docs.
---

# Deployment guidance

Use when the user asks how to deploy, migrate, or configure an app on Liara,
or asks for liara.json / Dockerfile / env-var setup.

## Procedure

1. `search_docs` for the platform (node, laravel, django, flask, next, docker,
   static…) deployment page — Persian query works well
   (e.g. «استقرار سریع برنامه‌های Next.js»).
2. If steps are ambiguous from snippets, `read_doc` the full page.
3. Answer with: prerequisites → config file (exact contents in a code block,
    e.g. liara.json) → deploy command (liara CLI or Console path) → common
    pitfalls for that platform (listen 0.0.0.0, PORT, build command, node
    version in package.json, upload size limits).
4. Cite the doc URLs under «منابع».

## Config generation rules

- liara.json: only fields the docs support for that platform (platform, app
  name, region); never invent fields.
- Dockerfile guidance: base image, PORT exposure, bind 0.0.0.0.
- When the user's repo details are unknown, ask (ask_question) for the
  platform/framework rather than assuming.

## Pitfall index (verify against docs before claiming)

- App must listen on 0.0.0.0 and the platform's port (not localhost).
- Node version comes from package.json "engines" or liara.json.
- Environment variables are set via Console or `liara env:set`, not committed
  files.
- Upload/body size limits differ per platform — cite the doc page.
