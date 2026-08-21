// tests/docs-pages.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getNav, resolvePage, urlToRoute, DEFAULT_ROUTE,
} from "../src/lib/docs-pages.js";

test("nav has grouped products with non-empty pages", () => {
  const nav = getNav();
  assert.ok(nav.length >= 5, `expected >=5 groups, got ${nav.length}`);
  for (const g of nav) {
    assert.match(g.id, /^[\w-]+$/);
    assert.ok(g.label.length > 0);
    assert.ok(g.pages.length > 0);
    for (const p of g.pages) assert.ok(p.route && p.title);
  }
  assert.equal(nav.at(-1).id, "api-ref");
});

test("resolvePage round-trips a guides route", () => {
  const nav = getNav();
  const some = nav[0].pages[0].route;
  const page = resolvePage(some);
  assert.ok(page);
  assert.equal(page.route, some);
  assert.ok(page.text.length > 200);
  assert.ok(page.url.startsWith("https://docs.liara.ir/"));
});

test("resolvePage returns null for unknown route", () => {
  assert.equal(resolvePage("no/such/page"), null);
});

test("urlToRoute maps docs.liara.ir urls, rejects others", () => {
  assert.equal(urlToRoute("https://docs.liara.ir/paas/nodejs"), "paas/nodejs");
  assert.equal(urlToRoute("https://developers.liara.ir/x"), null);
});

test("DEFAULT_ROUTE resolves", () => {
  assert.ok(resolvePage(DEFAULT_ROUTE));
});
