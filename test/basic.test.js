"use strict";

/* Tests for MMM-LiteraryClock's node_helper, run with `npm test`
 * (Node's built-in test runner, no external dependencies).
 *
 * We stub the `node_helper` base module so the helper can be required
 * outside a running MagicMirror. */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const vm = require("node:vm");
const translationLocales = ["de", "en", "es", "fr", "it", "pt"];
const translations = translationLocales.map((locale) => require(`../translations/${locale}.json`));

const moduleDir = path.join(__dirname, "..");

function loadFrontend(globalConfig) {
  let definition;
  vm.runInNewContext(fs.readFileSync(path.join(moduleDir, "MMM-LiteraryClock.js"), "utf8"), {
    config: globalConfig,
    Module: {
      register(name, moduleDefinition) {
        definition = moduleDefinition;
      },
    },
  });
  return definition;
}

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
const map = helper.load(helper.resolvePath("", "en-US")); // bundled dataset
const britishMap = helper.load(helper.resolvePath("", "en-GB"));
const bundledLocales = ["de-DE", "en-GB", "en-US", "es-ES", "fr-FR", "it-IT", "pt-PT"];
const bundledMaps = bundledLocales.map((locale) => helper.load(helper.resolvePath("", locale)));
const cfg = { allowNSFW: false, allowUnknown: true };

test("every bundled dataset parses into 1438 minutes", () => {
  for (const dataset of bundledMaps) assert.strictEqual(dataset.size, 1438);
});

test("bundled quote IDs are present and unique", () => {
  for (const dataset of bundledMaps) {
    const ids = [...dataset.values()].flat().map((entry) => entry.quoteId);
    assert.ok(ids.every(Boolean));
    assert.strictEqual(new Set(ids).size, ids.length);
  }
});

test("selects every bundled locale and documented aliases", () => {
  for (const locale of bundledLocales) {
    assert.match(helper.resolvePath("", locale), new RegExp(`quotes\\.${locale}\\.csv$`));
  }
  assert.match(helper.resolvePath("", "de"), /quotes\.de-DE\.csv$/);
  assert.match(helper.resolvePath("", "de_DE"), /quotes\.de-DE\.csv$/);
  assert.match(helper.resolvePath("", "en_UK"), /quotes\.en-GB\.csv$/);
  assert.match(helper.resolvePath("", "unsupported"), /quotes\.en-US\.csv$/);

  const us = map.get("07:59").find((entry) => entry.quoteId === "0759-002");
  const gb = britishMap.get("07:59").find((entry) => entry.quoteId === "0759-002");
  assert.strictEqual(us.phrase, "7:59");
  assert.strictEqual(gb.phrase, "7.59");
});

test("follows MagicMirror locale and language unless overridden", () => {
  const withGlobalLocale = loadFrontend({ language: "en", locale: "de-DE" });
  assert.strictEqual(withGlobalLocale.getQuoteLocale.call({ config: { locale: "" } }), "de-DE");
  assert.strictEqual(withGlobalLocale.getQuoteLocale.call({ config: { locale: "fr-FR" } }), "fr-FR");

  const withLanguageOnly = loadFrontend({ language: "es" });
  assert.strictEqual(withLanguageOnly.getQuoteLocale.call({ config: { locale: "" } }), "es");
});

test("interface translations have the same complete set of keys", () => {
  const expected = ["DATASET_ERROR", "LOADING", "LOADING_QUOTES"];
  for (const translation of translations) {
    assert.deepStrictEqual(Object.keys(translation).sort(), expected);
    assert.ok(Object.values(translation).every((value) => value.trim()));
  }
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

test("only the two documented source gaps use the digital fallback", () => {
  const missing = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m++) {
      const key = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      if (!map.has(key)) missing.push(key);
    }
  }
  assert.deepStrictEqual(missing, ["10:28", "18:44"]);
});

test("time phrase is located in every quote", () => {
  let miss = 0;
  for (const dataset of bundledMaps) {
    for (const [, arr] of dataset) {
      for (const e of arr) {
        const s = helper.splitQuote(e.quote, e.phrase);
        if (!s.time) miss++;
      }
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
