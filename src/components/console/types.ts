/**
 * Console surface domain types — field names are verbatim from the Liara PaaS
 * spec (agent/specs/paas.json: Projects, ProjectAllDetails, Releases schemas).
 * Every field is optional: the BFF passes upstream bodies through unmodified.
 */

export interface LiaraProject {
  _id?: string;
  project_id?: string;
  /** platform, e.g. "node" */
  type?: string;
  status?: string;
  scale?: number;
  planID?: string;
  created_at?: string;
  isDeployed?: boolean;
  hourlyPrice?: number;
  /** spec: object {_id, IP} — rendered defensively (IP → _id → hidden) */
  node?: { _id?: string; IP?: string };
  reservedDiskSpace?: number;
}

export interface LiaraGitInfo {
  branch?: string | null;
  message?: string | null;
  commit?: string | null;
  committedAt?: string | null;
}

export interface LiaraRelease {
  _id?: string;
  /** release status per spec: e.g. "ready" | "failed" | "building" */
  state?: string;
  createdAt?: string;
  finishedAt?: string;
  tag?: string;
  imageName?: string;
  projectType?: string;
  gitInfo?: LiaraGitInfo | null;
}

export interface LiaraReleases {
  total?: number;
  currentRelease?: string;
  readyReleasesCount?: number;
  releases?: LiaraRelease[];
  platform?: string;
}
/** /api/liara/apps/[name] body — spec passthrough: app = ProjectAllDetails {project}, each source may be null. */
export interface AppDetailData {
  app: { project?: LiaraProject } | null;
  releases: LiaraReleases | null;
  events: unknown;
}

/** Releases newest-first (createdAt is an ISO string; lexicographic sort). */
export function sortedReleases(releases: LiaraReleases | null | undefined): LiaraRelease[] {
  const list = releases?.releases;
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
}

/**
 * Config-summary rows for the detail view. Values must be plain strings —
 * spec object fields (e.g. node {_id, IP}) are unwrapped defensively so a
 * populated payload can never put a raw object into the React tree.
 */
export function configRows(app: LiaraProject): [string, string][] {
  const rows: [string, string][] = [
    ["پلتفرم", app.type ?? ""],
    ["پلن", app.planID ?? ""],
    ["مقیاس", app.scale !== undefined ? String(app.scale) : ""],
    ["گره", app.node ? (app.node.IP ?? app.node._id ?? "") : ""],
    ["قیمت ساعتی", app.hourlyPrice !== undefined ? String(app.hourlyPrice) : ""],
    ["فضای دیسک", app.reservedDiskSpace !== undefined ? String(app.reservedDiskSpace) : ""],
    ["ساخته‌شده", formatWhen(app.created_at)],
  ];
  return rows.filter(([, v]) => v !== "");
}

/** ISO createdAt → deterministic `YYYY-MM-DD HH:mm` (pure string ops, no ICU). */
export function formatWhen(value: string | null | undefined): string {
  if (!value) return "";
  const s = String(value);
  return s.length >= 16 ? `${s.slice(0, 10)} ${s.slice(11, 16)}` : s;
}
