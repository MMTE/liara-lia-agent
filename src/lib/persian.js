/**
 * Persian text normalization + tokenization for retrieval.
 * @module persian
 */

/**
 * Normalize Persian/Arabic text for search:
 * removes zero-width marks (ZWNJ etc.), unifies yeh/kaf glyphs,
 * maps Arabic-Indic and Persian digits to ASCII, collapses
 * whitespace and lowercases.
 * @param {string} s
 * @returns {string}
 */
export function normalizeFa(s) {
  return (s ?? "")
    .toString()
    .replace(/[\u200b-\u200f\u2060]/g, "") // ZWNJ, marks
    .replace(/[\u064A\u0649]/g, "\u06CC") // ي ى → ی
    .replace(/\u0643/g, "\u06A9") // ك → ک
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) =>
      String.fromCharCode((d.charCodeAt(0) & 0x0f) + 48),
    )
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Tokenize text into normalized search tokens (length > 1).
 * Letters, digits, dot, underscore and hyphen are token characters.
 * @param {string} s
 * @returns {string[]}
 */
export function tokenize(s) {
  return normalizeFa(s)
    .split(/[^\p{L}\p{N}._-]+/u)
    .filter((t) => t.length > 1);
}
