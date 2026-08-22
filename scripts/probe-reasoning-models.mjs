#!/usr/bin/env node
/**
 * Round 2: discrimination probe at realistic scale.
 *
 * Mirrors the actual Liara tool surface pain: several lookalike operations
 * (get vs list vs deleted variants, env-update vs env-set), nested request
 * bodies, required/optional mixes, enum fields. Persian instructions.
 * Scoring: right tool + required params exact + no invented params + nested
 * types correct.
 */
const KEY = process.env.AVALAI_API_KEY;
const BASE = "https://api.avalai.ir/v1";

const MODELS = process.argv[2]?.split(",").filter(Boolean) ?? [
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "deepseek-reasoner",
  "gpt-5.6-sol",
];

const TOOLS = [
  fn("getApps", "List all apps in the account.", { teamID: opt(str) }, []),
  fn("getAppByName", "Get details of one app.", { name: str, teamID: opt(str) }, ["name"]),
  fn("getDeletedApps", "List apps deleted in the last 7 days.", { teamID: opt(str) }, []),
  fn("updateEnvs", "Replace the environment variables of an app.", {
    name: str,
    envs: arr("string", "Entries like KEY=value"),
    buildId: opt(str, "Pin a build; optional"),
    teamID: opt(str),
  }, ["name", "envs"]),
  fn("getAppEnvs", "Read current environment variables of an app.", { name: str, teamID: opt(str) }, ["name"]),
  fn("restartApp", "Restart a running app.", { name: str, teamID: opt(str) }, ["name"]),
  fn("releasesDeploy", "Redeploy an old release of an app.", {
    name: str,
    releaseId: str,
    teamID: opt(str),
  }, ["name", "releaseId"]),
  fn("createApp", "Create a new app.", {
    name: str,
    platform: { type: "string", enum: ["node", "python", "docker", "static", "php", "laravel", "django", "flask", "next"] },
    port: opt(num, "Port the app listens on; optional for docker/static"),
    volume: opt(obj({ enabled: bol, name: opt(str) }), "Optional persistent disk"),
    teamID: opt(str),
  }, ["name", "platform"]),
  fn("getDatabaseBackups", "List backups of a managed database.", { name: str, teamID: opt(str) }, ["name"]),
  fn("createDatabase", "Create a managed database.", {
    name: str,
    plan: { type: "string", enum: ["free", "basic-1gb", "basic-2gb", "standard-4gb", "standard-8gb"] },
    type: { type: "string", enum: ["postgres", "mysql", "mariadb", "mongodb", "redis"] },
    username: opt(str, "Root user; optional, provider picks default"),
    teamID: opt(str),
  }, ["name", "plan", "type"]),
];

function str(d) { return { type: "string", ...(d ? { description: d } : {}) }; }
function num(d) { return { type: "number", ...(d ? { description: d } : {}) }; }
function bol(d) { return { type: "boolean", ...(d ? { description: d } : {}) }; }
function arr(items, d) { return { type: "array", items: { type: items }, ...(d ? { description: d } : {}) }; }
function obj(properties, d) { return { type: "object", properties, ...(d ? { description: d } : {}) }; }
function opt(schema, d) { return { ...schema, description: [d, schema.description].filter(Boolean).join(" — ") }; }
function fn(name, description, properties, required) {
  return { type: "function", function: { name, description, parameters: { type: "object", properties, required } } };
}

const CASES = [
  {
    msg: "اپ orders-api هنگ کرده. ری‌استارتش کن.",
    expect: { tool: "restartApp", exact: { name: "orders-api" }, forbiddenAny: ["teamID"] },
    note: "trivial restart",
  },
  {
    msg: "برای اپ payments یه دیتابیس postgres با پلن basic-1gb بساز، اسمش رو payment-db بذار.",
    expect: { tool: "createDatabase", exact: { name: "payment-db", plan: "basic-1gb", type: "postgres" }, forbiddenAny: ["username", "teamID"] },
    note: "nested enum body, must not invent username",
  },
  {
    msg: "env های اپ payments رو آپدیت کن: DATABASE_URL=postgres://x و REDIS_URL=redis://y",
    expect: { tool: "updateEnvs", exact: { name: "payments", envs: ["DATABASE_URL=postgres://x", "REDIS_URL=redis://y"] }, forbiddenAny: ["buildId", "teamID"] },
    note: "env array; must not touch buildId",
  },
  {
    msg: "اپ‌هایی که هفته پیش پاک کردم رو نشونم بده.",
    expect: { tool: "getDeletedApps", exact: {}, forbiddenAny: [] },
    note: "lookalike selection: getDeletedApps not getApps",
  },
  {
    msg: "نسخه‌ی قبلی اپ blog رو دوباره دیپلوی کن — release آیدی‌ش f3a2 هست.",
    expect: { tool: "releasesDeploy", exact: { name: "blog", releaseId: "f3a2" }, forbiddenAny: ["teamID"] },
    note: "required pair incl. opaque id",
  },
  {
    msg: "یه اپ جدید به اسم catalog با پلتفرم next بساز و یه دیسک ۵ گیگی بهش وصل کن.",
    expect: { tool: "createApp", partial: { name: "catalog", platform: "next" }, mustInclude: { volume: { enabled: true } }, forbiddenAny: ["port", "teamID"] },
    note: "optional nested volume object with enabled:true",
  },
];

const results = {};
async function probeModel(model) {
  results[model] = [];
  for (const c of CASES) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a cloud operator agent for the Liara platform. Call exactly one tool per turn, matching the user request precisely. Never invent parameter values; omit optional parameters the user did not specify. If a required value is unknown, ask." },
            { role: "user", content: c.msg },
          ],
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });
      const ms = Date.now() - t0;
      if (!res.ok) { results[model].push({ case: c.note, error: `HTTP ${res.status}`, ms }); console.error(`${model} | ${c.note} | HTTP ${res.status} (${ms}ms)`); continue; }
      const j = await res.json();
      const msg = j.choices?.[0]?.message ?? {};
      const call = msg.tool_calls?.[0]?.function;
      if (!call) { results[model].push({ case: c.note, noTool: true, asked: (msg.content ?? "").slice(0, 70), ms }); console.error(`${model} | ${c.note} | no tool, asked (${ms}ms)`); continue; }
      let args = {};
      let parseErr = null;
      try { args = JSON.parse(call.arguments); } catch (e) { parseErr = String(e).slice(0, 50); }
      const wrong = [];
      for (const [k, v] of Object.entries(c.expect.exact ?? {})) if (JSON.stringify(args[k]) !== JSON.stringify(v)) wrong.push(`exact.${k}=${JSON.stringify(args[k])}`);
      for (const [k, v] of Object.entries(c.expect.partial ?? {})) if (JSON.stringify(args[k]) !== JSON.stringify(v)) wrong.push(`partial.${k}=${JSON.stringify(args[k])}`);
      for (const [k, v] of Object.entries(c.expect.mustInclude ?? {})) {
        if (!(k in args)) wrong.push(`missing.${k}`);
        else if (typeof v === "object") for (const [kk, vv] of Object.entries(v)) if (JSON.stringify(args[k]?.[kk]) !== JSON.stringify(vv)) wrong.push(`${k}.${kk}=${JSON.stringify(args[k]?.[kk])}`);
      }
      const invented = (c.expect.forbiddenAny ?? []).filter((k) => k in args);
      const rightTool = call.name === c.expect.tool;
      const pass = rightTool && !wrong.length && !invented.length && !parseErr;
      results[model].push({
        case: c.note, tool: call.name, rightTool, wrong, invented, parseErr, pass,
        ms, usage: j.usage ? { rt: j.usage.completion_tokens_details?.reasoning_tokens ?? j.usage.reasoning_tokens ?? null, ct: j.usage.completion_tokens, pt: j.usage.prompt_tokens } : null,
      });
      console.error(`${model} | ${c.note} | ${pass ? "PASS" : "FAIL"} tool=${call.name} wrong=[${wrong}] inv=[${invented}] (${ms}ms)`);
    } catch (e) {
      results[model].push({ case: c.note, error: String(e).slice(0, 80) });
      console.error(`${model} | ${c.note} | ERR ${String(e).slice(0, 60)}`);
    }
  }
}
await Promise.all(MODELS.map(probeModel));
for (const [m, rs] of Object.entries(results)) {
  const pass = rs.filter((r) => r.pass).length;
  const medMs = rs.filter((r) => r.ms).sort((a, b) => a.ms - b.ms)[Math.floor(rs.length / 2)]?.ms;
  console.error(`${m}: ${pass}/${rs.length} pass, med ${medMs}ms`);
}
console.log(JSON.stringify(results, null, 2));
