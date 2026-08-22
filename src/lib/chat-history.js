/**
 * Client-side multi-conversation history for the Lia widget.
 *
 * The active conversation persists under STORAGE_KEY (turn-meter.js) and is
 * rehydrated by useLiaAgent on mount. This module layers a list of past
 * conversations on top: every finished turn upserts the snapshot into
 * `liara-agent-history` keyed by the eve session id, so «گفت‌وگوی جدید»
 * archives the old chat and the history picker can restore any of the last
 * conversations (write-back into STORAGE_KEY + remount).
 *
 * Pure localStorage CRUD — safe on the client only.
 */
import { STORAGE_KEY } from "./turn-meter.js";

export const HISTORY_KEY = "liara-agent-history";
export const HISTORY_LIMIT = 30;

/**
 * @typedef {Object} ChatHistoryEntry
 * @property {string} id — eve session id (resume continues server-side state)
 * @property {string} title — first user message (fallback: history label)
 * @property {number} updatedAt — epoch ms of the last finished turn
 * @property {{events?: unknown[], session?: {sessionId: string, streamIndex: number}}} snapshot
 */

/** @param {unknown} v @returns {v is Record<string, unknown>} */
function isObj(v) {
  return typeof v === "object" && v !== null;
}

/**
 * Chats newest-first. Corrupt storage degrades to an empty list.
 * @returns {ChatHistoryEntry[]}
 */
export function listChats() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => isObj(e) && typeof e.id === "string" && isObj(e.snapshot))
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

/**
 * Insert or replace a chat entry (keyed by id), newest-first, capped.
 * Best-effort: storage-full and private-mode failures are swallowed.
 * @param {ChatHistoryEntry} entry
 * @returns {void}
 */
export function upsertChat(entry) {
  if (typeof window === "undefined") return;
  try {
    const rest = listChats().filter((e) => e.id !== entry.id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...rest].slice(0, HISTORY_LIMIT)));
  } catch {
    /* storage full — history is best-effort */
  }
}

/**
 * @param {string} id
 * @returns {ChatHistoryEntry | null}
 */
export function getChat(id) {
  return listChats().find((e) => e.id === id) ?? null;
}

/**
 * @param {string} id
 * @returns {void}
 */
export function deleteChat(id) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(listChats().filter((e) => e.id !== id)));
  } catch {
    /* non-fatal */
  }
}

/**
 * Restore a chat as the active conversation: copies its snapshot into the
 * STORAGE_KEY slot the widget rehydrates from. Returns false when the id is
 * unknown (nothing installed, caller should not remount).
 *
 * @param {string} id
 * @returns {boolean}
 */
export function installChat(id) {
  const chat = getChat(id);
  if (!chat) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chat.snapshot));
  } catch {
    return false;
  }
  return true;
}

/**
 * One-time migration: conversations created before the history list existed
 * were persisted only as the single STORAGE_KEY snapshot. Resurrect that
 * snapshot as a history entry so it shows up in the picker. No-ops when the
 * snapshot is missing, already listed, or holds no user turn.
 * @returns {boolean} true when a legacy chat was added
 */
export function migrateLegacyChat() {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw);
    const id =
      isObj(saved) && isObj(saved.session) && typeof saved.session.sessionId === "string"
        ? saved.session.sessionId
        : null;
    const events = isObj(saved) && Array.isArray(saved.events) ? saved.events : [];
    if (!id || events.length === 0) return false;
    if (listChats().some((e) => e.id === id)) return false;
    // The first user turn (message.received) titles the entry.
    const firstUser = events.find(
      (e) => isObj(e) && e.type === "message.received" && isObj(e.data),
    );
    const firstData = isObj(firstUser) ? firstUser.data : null;
    const parts = firstData && Array.isArray(firstData.parts) ? firstData.parts : [];
    const text = String(
      (firstData && typeof firstData.message === "string" && firstData.message) ||
        (isObj(parts[0]) && typeof parts[0].text === "string" ? parts[0].text : "") ||
        "",
    ).trim();
    if (!text) return false;
    const meta = isObj(firstUser) && isObj(firstUser.meta) ? firstUser.meta : null;
    const at = meta && typeof meta.at === "string" ? Date.parse(meta.at) : NaN;
    upsertChat({
      id,
      title: text.slice(0, 80),
      updatedAt: Number.isFinite(at) ? at : Date.now(),
      snapshot: saved,
    });
    return true;
  } catch {
    return false;
  }
}
