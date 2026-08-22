#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const evePort = process.env.EVE_NEXT_PRODUCTION_PORT || "4274";

const children = [
  spawn(process.execPath, [path.join(root, ".output/server/index.mjs")], {
    cwd: root,
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      NITRO_HOST: "127.0.0.1",
      PORT: evePort,
      NITRO_PORT: evePort,
    },
    stdio: "inherit",
  }),
  spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start"], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  }),
];

const exits = children.map(
  (child) => new Promise((resolve) => child.once("exit", (code, signal) => resolve({ child, code, signal }))),
);
let requestedSignal;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    requestedSignal = signal;
    for (const child of children) child.kill(signal);
  });
}

const first = await Promise.race(exits);
if (!requestedSignal) {
  console.error(`child process exited (code=${first.code} signal=${first.signal})`);
  for (const child of children) {
    if (child !== first.child) child.kill("SIGTERM");
  }
}
await Promise.all(exits);
if (!requestedSignal) process.exitCode = first.code ?? 1;
