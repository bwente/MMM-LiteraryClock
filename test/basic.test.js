"use strict";

/* Tests for MMM-LiteraryClock's node_helper, run with `npm test`
 * (Node's built-in test runner, no external dependencies).
 *
 * We stub the `node_helper` base module so the helper can be required
 * outside a running MagicMirror. */
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const Module = require("node:module");

const moduleDir = path.join(__dirname, "..");

// Stub `require("node_helper")` -> { create: (o) => o }
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "node_helper") return { create: (obj) => obj };
  return origLoad.call(this, request, parent, isMain);
};

const helper = require(path.join(moduleDir, "node_helper.js"));
Module._load = origLoad; // restore

helper.path = moduleDir;
helper.start();
const map = helper.load(helper.resolvePath("")); // bundled dataset
const cfg = { allowNSFW: false, allowUnknown: true };

test("dataset parses into many minutes", () => {
  assert.ok(map.size > 1400, `expected >1400 minutes, got ${map.size}`);
});

test("every minute of the day resolves to a quote search result", () => {
  let unresolved = 0;
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m++) {
      const key = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      if (!helper.resolve(map, key, cfg)) unresolved++;
    }
  }
  assert.strictEqual(unresolved, 0, `${unresolved} minutes had no quote`);
});

test("time phrase is located in every quote", () => {
  let miss = 0;
  for (const [, arr] of map) {
    for (const e of arr) {
      const s = helper.splitQuote(e.quote, e.phrase);
      if (!s.time) miss++;
    }
  }
  assert.strictEqual(miss, 0, `${miss} quotes had an unlocatable time phrase`);
});

test("split reassembles to the original quote", () => {
  for (const key of ["09:00", "12:00", "16:20", "23:58"]) {
    const hit = helper.resolve(map, key, cfg);
    const s = helper.splitQuote(hit.quote, hit.phrase);
    assert.strictEqual(s.before + s.time + s.after, hit.quote);
  }
});

test("nsfw quotes are excluded unless allowed", () => {
  let nsfwCount = 0;
  for (const [, arr] of map) {
    for (const e of arr) if (e.sfw === "nsfw") nsfwCount++;
  }
  assert.ok(nsfwCount > 0, "sanity: dataset should contain some nsfw-flagged quotes");
  for (const [, arr] of map) {
    for (const e of arr) {
      if (e.sfw === "nsfw") {
        assert.strictEqual(helper.allowed(e, { allowNSFW: false }), false);
        assert.strictEqual(helper.allowed(e, { allowNSFW: true }), true);
      }
    }
  }
});

test("unknown and invalid ratings follow allowUnknown", () => {
  for (const sfw of ["unknown", "", "unrated", "typo"]) {
    const entry = { sfw };
    assert.strictEqual(helper.allowed(entry, { allowUnknown: false }), false);
    assert.strictEqual(helper.allowed(entry, { allowUnknown: true }), true);
  }
  assert.strictEqual(helper.allowed({ sfw: "sfw" }, { allowUnknown: false }), true);
});

test("an uncovered minute resolves to an earlier minute", () => {
  const sparse = new Map([
    ["10:00", [{ quote: "At ten", phrase: "ten", sfw: "sfw" }]],
  ]);
  const hit = helper.resolve(sparse, "10:01", cfg);
  assert.strictEqual(hit.resolvedMinute, "10:00");
  assert.notStrictEqual(hit.resolvedMinute, "10:01");
});
