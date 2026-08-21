/**
 * Reciprocal Rank Fusion.
 * @module rrf
 */

/**
 * Fuse multiple ranked id lists with RRF: each list contributes
 * 1 / (k + rank + 1) per item (rank starts at 0).
 * @param {{id: string}[][]} lists ranked lists
 * @param {number} [k=60]
 * @returns {{id: string, score: number}[]} union, sorted by descending score
 */
export function rrfFuse(lists, k = 60) {
  const scores = new Map();
  for (const list of lists)
    list.forEach(({ id }, rank) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
    });
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}
