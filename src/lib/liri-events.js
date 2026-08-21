// src/lib/liri-events.js
/** Maps eve stream messages to the Liri UI message union (prototype/src/types/agent.ts). */

export const TOOL_META = {
  search_docs: { label: "جست‌وجو در مستندات لیارا", kind: "docs" },
  read_doc: { label: "خواندن سند کامل", kind: "docs" },
  getApps: { label: "دریافت فهرست برنامه‌ها", kind: "read" },
  getAppByName: { label: "خواندن وضعیت برنامه", kind: "read" },
  getAppLogs: { label: "خواندن لاگ‌های برنامه", kind: "read" },
  getAppEvents: { label: "خواندن رویدادهای برنامه", kind: "read" },
  getAppReleases: { label: "بررسی تاریخچه استقرار", kind: "read" },
  getAppCpuReports: { label: "گزارش CPU", kind: "read" },
  getAppMemoryReports: { label: "گزارش حافظه", kind: "read" },
  getAppSummaryReports: { label: "خلاصه متریک‌ها", kind: "read" },
  restartApp: { label: "ری‌استارت برنامه", kind: "write" },
  updateEnvs: { label: "تغییر متغیرهای محیطی", kind: "write" },
  releasesDeploy: { label: "استقرار دوباره", kind: "write" },
  getListDatabases: { label: "دریافت فهرست دیتابیس‌ها", kind: "read" },
  ask_question: { label: "پرسش از کاربر", kind: "read" },
  getDatabase: { label: "خواندن وضعیت دیتابیس", kind: "read" },
};

const faNum = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const isObj = (v) => typeof v === "object" && v !== null;

function metaFor(toolName) {
  for (const [key, meta] of Object.entries(TOOL_META)) if (toolName.includes(key)) return { key, ...meta };
  return { key: toolName, label: toolName, kind: "read" };
}

export function summarizeOutput(toolName, output) {
  if (!isObj(output)) return "";
  const o = isObj(output.output) ? output.output : isObj(output.result) ? output.result : output;
  const first = Array.isArray(o.results) && o.results[0];
  if (toolName.includes("search_docs")) return `${faNum(o.resultCount ?? (o.results?.length ?? 0))} نتیجه${first?.title ? " — " + first.title : ""}`;
  if (toolName.includes("read_doc")) return String(o.slug ?? "");
  if (toolName.includes("getApps")) return `${faNum(o.projects?.length ?? 0)} برنامه`;
  if (toolName.includes("getAppLogs")) return `${faNum(String(o.text ?? o.logs ?? "").split("\n").filter(Boolean).length)} خط لاگ`;
  if (toolName.includes("Databases") && Array.isArray(o.databases)) return `${faNum(o.databases.length)} دیتابیس`;
  for (const v of Object.values(o)) if (typeof v === "string" && v.length <= 80) return v;
  return "";
}

function inputDetail(toolName, input) {
  if (!isObj(input)) return "";
  if (toolName.includes("updateEnvs") && isObj(input.env)) {
    return Object.entries(input.env).map(([k, v]) => `${k} = ${String(v).slice(0, 60)}`).join(" · ");
  }
  const name = input.name ?? input.projectName ?? input.app;
  if (name) return `برنامه ${name}`;
  const s = JSON.stringify(input);
  return s && s.length > 2 ? s.slice(0, 80) : "";
}

function partsText(parts) {
  return parts.filter(isObj).filter((p) => p.type === "text" && typeof p.text === "string").map((p) => p.text).join("\n\n");
}

function citationsFrom(toolParts) {
  const out = [], seen = new Set();
  for (const p of toolParts) {
    if (!String(p.toolName ?? "").includes("search_docs")) continue;
    const carrier = isObj(p.output) ? p.output : isObj(p.result) ? p.result : null;
    for (const r of (carrier && Array.isArray(carrier.results) ? carrier.results : []).filter(isObj)) {
      if (typeof r.url !== "string" || seen.has(r.url)) continue;
      seen.add(r.url);
      const m = r.url.match(/^https:\/\/docs\.liara\.ir\/(.+?)\/?$/);
      out.push({ title: String(r.title ?? r.url), url: r.url, route: m ? m[1] : null });
    }
  }
  return out.slice(0, 8);
}

export function mapConversation(messages) {
  const out = [];
  let verifyMode = false;
  for (const m of messages ?? []) {
    if (!isObj(m) || !Array.isArray(m.parts)) continue;
    if (m.role === "user") { out.push({ id: m.id, kind: "user", text: partsText(m.parts) }); continue; }
    const parts = m.parts.filter(isObj);
    const tools = parts.filter((p) => p.type === "dynamic-tool");
    if (tools.length) {
      out.push({
        id: `${m.id}-trace`, kind: "trace", variant: verifyMode ? "verify" : "inspect",
        steps: tools.map((p) => {
          const meta = metaFor(String(p.toolName ?? ""));
          const state = p.state === "output-available" || p.state === "error" || String(p.state).includes("reject") ? "done" : "active";
          const result = p.state === "output-available" ? summarizeOutput(String(p.toolName ?? ""), isObj(p.output) ? p.output : p.result) : "";
          return { tool: meta.key, label: meta.label, kind: meta.kind, state, result };
        }),
      });
    }
    for (const p of tools) {
      const req = p.toolMetadata?.eve?.inputRequest;
      if (!isObj(req) || typeof req.requestId !== "string") continue;
      const meta = metaFor(String(p.toolName ?? ""));
      const options = (Array.isArray(req.options) ? req.options : []).filter(isObj)
        .map((o) => ({ id: String(o.id), label: String(o.label ?? o.id) }));
      const question = String(req.prompt ?? "");
      if (String(req.kind) === "tool-approval") {
        out.push({
          id: `${m.id}-plan-${req.requestId}`, kind: "plan", requestId: req.requestId,
          summary: question,
          changes: [{ tool: meta.key, label: meta.label, risk: meta.kind === "write" ? "caution" : "safe", detail: inputDetail(meta.key, p.input) }],
          options, status: "pending",
        });
      } else if (p.state === "approval-requested") {
        out.push({ id: `${m.id}-clarify-${req.requestId}`, kind: "clarify", requestId: req.requestId, question, options, answered: null });
      }
    }
    // resolution pass: an approval part that moved past 'approval-requested' marks plans answered
    for (const p of tools) {
      if (p.state === "approval-requested" || !isObj(p.toolMetadata?.eve?.inputRequest)) continue;
      const rid = p.toolMetadata.eve.inputRequest.requestId;
      const st = String(p.state);
      for (const msg of out) {
        if (msg.kind !== "plan" || msg.requestId !== rid) continue;
        msg.status = st.includes("reject") ? "rejected" : "approved";
        verifyMode = msg.status === "approved";
      }
      if (st.includes("reject")) verifyMode = false;
    }
    const text = partsText(m.parts);
    const citations = citationsFrom(tools);
    if (text || citations.length) out.push({ id: `${m.id}-answer`, kind: "answer", text, citations });
  }
  return out;
}
