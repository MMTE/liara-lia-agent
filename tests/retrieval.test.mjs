import test from "node:test";
import assert from "node:assert/strict";

import { normalizeFa, tokenize } from "../src/lib/persian.js";
import { BM25Index } from "../src/lib/bm25.js";
import { rrfFuse } from "../src/lib/rrf.js";

test("normalizeFa removes ZWNJ (U+200C)", () => {
  assert.equal(normalizeFa("برنامه\u200cها"), "برنامهها");
  assert.equal(normalizeFa("می\u200cتوانید"), "میتوانید");
});

test("normalizeFa maps Arabic yeh and alef maksura to Farsi yeh", () => {
  assert.equal(normalizeFa("ي"), "ی");
  assert.equal(normalizeFa("ى"), "ی");
  assert.equal(normalizeFa("فيلم"), "فیلم");
});

test("normalizeFa maps Arabic kaf to Farsi kaf", () => {
  assert.equal(normalizeFa("كتاب"), "کتاب");
  assert.equal(normalizeFa("ك"), "ک");
});

test("normalizeFa maps Arabic-Indic and Persian digits to ASCII", () => {
  assert.equal(normalizeFa("۰۱۲۳۴۵۶۷۸۹"), "0123456789");
  assert.equal(normalizeFa("٠١٢٣٤٥٦٧٨٩"), "0123456789");
  assert.equal(normalizeFa("سال ۱۴۰۴"), "سال 1404");
});

test("normalizeFa collapses whitespace and lowercases", () => {
  assert.equal(normalizeFa("  hello \n\t world  "), "hello world");
  assert.equal(normalizeFa("Flask DEPLOY"), "flask deploy");
});

test("normalizeFa applies all rules together and tolerates null", () => {
  assert.equal(
    normalizeFa("استقرار برنامه\u200cهای Flask در سال ۱۴۰۴"),
    "استقرار برنامههای flask در سال 1404",
  );
  assert.equal(normalizeFa(null), "");
});

test("tokenize normalizes, splits on non-word chars, drops single-char tokens", () => {
  assert.deepEqual(tokenize("Liara CLI را نصب کنید"), [
    "liara",
    "cli",
    "را",
    "نصب",
    "کنید",
  ]);
  assert.deepEqual(tokenize("a.b my-app"), ["a.b", "my-app"]);
  assert.deepEqual(tokenize(""), []);
});

const DOCS = [
  {
    id: "flask",
    text: "استقرار سریع برنامه‌های Flask در لیارا با کنسول یا CLI انجام می‌شود. برای استقرار، فایل requirements.txt لازم است.",
  },
  {
    id: "dbaas",
    text: "پشتیبان‌گیری از دیتابیس‌های مدیریت‌شده در لیارا به صورت خودکار و روزانه انجام می‌شود.",
  },
  {
    id: "apiref",
    text: "The Liara REST API lets you manage projects, releases and environment variables.",
  },
];

test("BM25 ranks the relevant document first", () => {
  const index = new BM25Index(DOCS);
  const results = index.search("استقرار flask");
  assert.ok(results.length > 0);
  assert.equal(results[0].id, "flask");
  assert.ok(results[0].score > 0);
});

test("BM25 matches Persian queries against normalized text", () => {
  const index = new BM25Index(DOCS);
  // Query written without ZWNJ / with Arabic yeh; doc text has both variants.
  assert.equal(index.search("پشتیبانگیری")[0].id, "dbaas");
  assert.equal(index.search("میشود روزانه")[0].id, "dbaas");
  assert.equal(index.search("environment variables")[0].id, "apiref");
});

test("BM25 respects the k limit, returns [] on no match, scores descending", () => {
  const index = new BM25Index(DOCS);
  assert.ok(index.search("لیارا", 1).length <= 1);
  assert.deepEqual(index.search("kubernetes-xyz"), []);
  const results = index.search("لیارا استقرار requirements");
  const scores = results.map((r) => r.score);
  const sorted = [...scores].sort((a, b) => b - a);
  assert.deepEqual(scores, sorted);
});

test("rrfFuse unions lists with reciprocal ranks 1/(k+rank+1), k=60", () => {
  const fused = rrfFuse([
    [{ id: "a" }, { id: "b" }],
    [{ id: "b" }, { id: "c" }],
  ]);
  assert.deepEqual(
    fused.map((r) => r.id),
    ["b", "a", "c"],
  );
  assert.equal(fused[0].score, 1 / 61 + 1 / 62);
  assert.equal(fused[1].score, 1 / 61);
  assert.equal(fused[2].score, 1 / 62);
});

test("rrfFuse supports custom k and empty input", () => {
  const fused = rrfFuse([[{ id: "x" }, { id: "y" }]], 0);
  assert.equal(fused[0].id, "x");
  assert.equal(fused[0].score, 1);
  assert.equal(fused[1].score, 0.5);
  assert.deepEqual(rrfFuse([]), []);
  assert.deepEqual(rrfFuse([[], []]), []);
});
