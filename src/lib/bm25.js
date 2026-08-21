/**
 * Standard Okapi BM25 (k1 = 1.5, b = 0.75) over tokenized docs.
 * @module bm25
 */
import { tokenize } from "./persian.js";

/**
 * @typedef {Object} Doc
 * @property {string} id
 * @property {string} text
 */

/**
 * @typedef {Object} Hit
 * @property {string} id
 * @property {number} score
 */

export class BM25Index {
  /**
   * @param {Doc[]} docs
   */
  constructor(docs) {
    /** @type {number} */
    this.k1 = 1.5;
    /** @type {number} */
    this.b = 0.75;
    /** @type {Map<string, number>} doc id → token count */
    this.docLen = new Map();
    /** @type {Map<string, Map<string, number>>} term → (doc id → tf) */
    this.postings = new Map();
    for (const { id, text } of docs) {
      const tokens = tokenize(text);
      this.docLen.set(id, tokens.length);
      const tf = new Map();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const [term, n] of tf) {
        let posting = this.postings.get(term);
        if (!posting) this.postings.set(term, (posting = new Map()));
        posting.set(id, n);
      }
    }
    /** @type {number} */
    this.N = this.docLen.size;
    /** @type {number} */
    this.avgdl = this.N
      ? [...this.docLen.values()].reduce((a, b) => a + b, 0) / this.N
      : 0;
  }

  /**
   * Search the index; returns hits sorted by descending BM25 score.
   * @param {string} q
   * @param {number} [k=10]
   * @returns {Hit[]}
   */
  search(q, k = 10) {
    const scores = new Map();
    for (const term of new Set(tokenize(q))) {
      const posting = this.postings.get(term);
      if (!posting) continue;
      const df = posting.size;
      const idf = Math.log(1 + (this.N - df + 0.5) / (df + 0.5));
      for (const [id, tf] of posting) {
        const dl = this.docLen.get(id) ?? 0;
        const denom =
          tf + this.k1 * (1 - this.b + this.b * (dl / (this.avgdl || 1)));
        scores.set(id, (scores.get(id) ?? 0) + (idf * tf * (this.k1 + 1)) / denom);
      }
    }
    return [...scores.entries()]
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
}
