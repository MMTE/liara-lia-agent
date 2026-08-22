# Problem Report — eve sidecar dies instantly in the Liara container

**Date:** 2026-08-22 · **App:** `liara-lia-agent` (Next platform, small-g2/standard) → https://liara-lia-agent.liara.run

## The situation

The project is two processes in one Liara app:

```
Next.js (standalone, port $PORT)          eve agent (Nitro sidecar, port 4274)
  /chat /console /api/*                     /eve/v1/*  (sessions, streams)
  rewrites /eve/* → http://127.0.0.1:4274   prebuilt by `npx eve build` → .output/
```

`withEve()` (from the `eve` framework) bakes the `/eve/* → 127.0.0.1:4274`
proxy into the Next routes manifest at **build** time. Per eve's docs, the
sidecar is supposed to be spawned lazily when the rewrites are evaluated.
**On Next 16, `next start`/standalone never re-evaluates the manifest**, so
withEve's spawn never fires and the proxy points at a dead port → every
`POST /eve/v1/session` returns 500. (Verified locally: no spawn happens,
with a `child_process.spawn` spy patched in via `NODE_OPTIONS`.)

## The fix attempt (current state)

`src/instrumentation.ts` — Next's `register()` hook runs once per server
process in **every** runtime, including Liara's standalone container:

1. Guards: nodejs runtime, production, not Vercel, no dev origin.
2. Finds `.output/server/index.mjs` by walking up from `process.cwd()`
   (needed: Liara may run with cwd ≠ app root; diagnostics show cwd=/app
   and the file IS found — `outputVisibleFrom: ["."]`).
3. Probes `127.0.0.1:4274/eve/v1/health` (single-sidecar guard).
4. Spawns `node .output/server/index.mjs` with `PORT/NITRO_PORT=4274`,
   stdout/stderr piped to `/tmp/eve-sidecar.log`, mirrored to
   `GET /api/sidecar-log` for remote diagnosis.

Deployed diagnostics prove the hook runs and finds the entry. **The child
then exits with code 1 after ~0.9s, producing zero bytes of output.**

## Evidence

`GET /api/sidecar-log` on production:

```
2026-08-22T02:44:19.569Z [instrumentation] spawning /app/.output/server/index.mjs on :4274 (pid 32)
2026-08-22T02:44:20.460Z [instrumentation] sidecar exited (code=1 signal=null)
```

`GET /api/health`:

```json
{"eve":{"port":4274,"sidecar":{"ok":false,"error":"fetch failed"},
        "cwd":"/app","outputVisibleFrom":["."],"instrumentationRan":true}}
```

Locally the exact same bundle + spawn works: boots in ~2s, prints
`➜ Listening on http://127.0.0.1:4274/`, health OK, and the full smoke
suite passes (3/3 scenarios, citations, tool calls) over the Avalai
provider.

## What has been ruled out

- **withEve's own spawn** — never fires on Next 16 (see above); we own it now.
- **`.output` missing in the container** — shipped in the tarball, found at
  `/app/.output` (diagnostics prove it).
- **Liara hooks** — `liara_pre_start.sh` (nohup sidecar) made Liara's
  `multirun` wrapper kill the whole container ("Application Error" page);
  removed. `liara_post_build.sh` (`npx eve build` on Liara) resolves eve@0.44
  from the registry instead of the local 0.42 and fails to find the agent
  root; removed. Prebuilt-in-tarball is the working delivery path.
- **`.eve/` state dir missing** — moved `.eve` away locally and the sidecar
  still boots fine; world-local recreates its state dir. Not the cause.
- **Stale bundle/env** — the shipped `.output` is rebuilt by
  `scripts/deploy-agent.mjs` immediately before tarring; the provider
  (Avalai) and env vars are baked correctly (health shows avalai).
- **Port/multirun conflicts** — only one sidecar spawn guard, port probe in
  place; without any hook the app itself boots and serves fine.

## Remaining hypotheses (unchecked)

1. **stdin/stdio pipe behavior in their runtime** — the child gets
   `["ignore","pipe","pipe"]`; if Liara's process supervisor (the thing that
   runs `npm start`/standalone) interposes something (pid namespace, seccomp,
   non-standard fd environment), an early fd operation could fail. Zero
   output on a code-1 exit is unusual: node normally prints module-load
   errors. Something kills it before the first write, or the output is lost.
2. **Node version / ABI mismatch** — platformConfig `nodeVersion: 24`. The
   nitro bundle is plain ESM JS (no native addons listed), so unlikely, but
   unverified in-container.
3. **Resource limits at spawn** — cgroup memory/thread limits could make the
   V8 startup or worker-thread init abort immediately (exit 1, no stdout).
   small-g2 = 1 GB; the same bundle idles locally at far less, but the
   container also runs the Next server concurrently.
4. **`.output` payload damage in transit** — the tarball ships a ~500 KB
   `index.mjs` plus `_libs/`; if the source-upload layer stripped or
   re-encoded something (e.g. symlinks in `.output/server/_libs`?), node
   could fail module resolution instantly. `verbatimSymlinks` is used when
   staging; Liara's source fetch re-extracts on their side — unverifiable
   from outside the container.
5. **Env var poisoning** — instrumentation passes `...process.env` to the
   child. The container env includes Liara-injected vars (`PORT`, `HOSTNAME`,
   `MEMORY_AVAILABLE`, …). If the nitro server or a bundled lib reacts badly
   to one of them (e.g. `NITRO_PORT` vs an injected `PORT`-like var that
   wins), boot could abort. Locally we don't have those vars.

## Next diagnostics (cheapest first)

1. In instrumentation, spawn `node --version` and `node -e "console.log(1)"`
   as canaries through the same path; write their output to the log file.
   If even the canary dies code-1, it's the spawn environment, not the bundle.
2. Log the exact child env keys (names only) to the sidecar log and diff
   against local.
3. Spawn the sidecar with `stdio: "inherit"` (its output goes to the main
   process's stderr → Liara's runtime log, which the panel can show).
4. Ship a checksum of `.output/server/index.mjs` computed at deploy time and
   compare against one computed in-container at register() time.

## Side constraints

- Deploy budget: the daily release cap forced a recreate of the app on the
  `standard` bundle (50/day). Current budget left ≈ 45 deploys — enough,
  but each cycle is ~4 minutes; canaries should be batched into one deploy.
- Everything must keep working locally too (`next start` on macOS): the
  instrumentation path is shared.
