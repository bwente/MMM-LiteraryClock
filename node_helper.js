/* MagicMirror² Module: MMM-LiteraryClock
 * node_helper.js — loads a literature-clock dataset, groups quotes by
 * minute, and serves a filtered random quote (already split around the
 * time phrase) to the front-end on request.
 *
 * Supports multiple module instances and multiple datasets (e.g. other
 * languages) via the `dataFile` config option; each file is parsed once
 * and cached.
 *
 * Dataset format (pipe-delimited, UTF-8):
 *   time | timePhrase | quote | title | author | sfw
 */
const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
  start() {
    this.datasets = new Map(); // absPath -> Map("HH:MM" -> [entries])
  },

  resolvePath(dataFile) {
    const file = dataFile && String(dataFile).trim() ? dataFile : "litclock_annotated.csv";
    return path.isAbsolute(file) ? file : path.join(this.path, file);
  },

  // Load + cache a dataset. Returns the "HH:MM" -> [entries] map.
  load(absPath) {
    if (this.datasets.has(absPath)) return this.datasets.get(absPath);
    const raw = fs.readFileSync(absPath, "utf8");
    const map = new Map();
    let rows = 0;
    for (const line of raw.split(/\r?\n/)) {
      if (!line) continue;
      const parts = line.split("|");
      if (parts.length < 6) continue;
      const time = parts[0].trim();
      if (!/^\d{2}:\d{2}$/.test(time)) continue;
      const phrase = parts[1];
      // title/author/sfw are the last three fields; quote is everything
      // between, re-joined in case a stray pipe ever lands in a quote.
      const quote = parts.slice(2, parts.length - 3).join("|");
      const title = parts[parts.length - 3];
      const author = parts[parts.length - 2];
      let sfw = (parts[parts.length - 1] || "").trim().toLowerCase();
      if (sfw === "nswf") sfw = "nsfw"; // fix the one typo in the source data
      if (!map.has(time)) map.set(time, []);
      map.get(time).push({ phrase, quote, title, author, sfw });
      rows += 1;
    }
    this.datasets.set(absPath, map);
    console.log(`[MMM-LiteraryClock] loaded ${rows} quotes across ${map.size} minutes from ${path.basename(absPath)}`);
    return map;
  },

  allowed(entry, cfg) {
    if (entry.sfw === "nsfw") return cfg.allowNSFW === true;
    if (entry.sfw === "sfw") return true;
    return cfg.allowUnknown !== false;
  },

  // Locate the time phrase inside the quote (tolerating case and curly vs
  // straight quotes) and split into before / time / after.
  splitQuote(quote, phrase) {
    if (phrase) {
      let idx = quote.indexOf(phrase);
      if (idx === -1) idx = quote.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx === -1) {
        const norm = (s) =>
          s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
        // char-for-char replacement keeps indices aligned with the original
        idx = norm(quote).toLowerCase().indexOf(norm(phrase).toLowerCase());
      }
      if (idx !== -1) {
        return {
          before: quote.slice(0, idx),
          time: quote.slice(idx, idx + phrase.length),
          after: quote.slice(idx + phrase.length),
        };
      }
    }
    return { before: quote, time: "", after: "" };
  },

  pickForMinute(map, minute, cfg) {
    const pool = (map.get(minute) || []).filter((e) => this.allowed(e, cfg));
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  },

  // Walk backwards up to 60 minutes so the clock never blanks on the
  // handful of uncovered minutes.
  resolve(map, minute, cfg) {
    let [h, m] = minute.split(":").map(Number);
    for (let step = 0; step < 60; step++) {
      const key = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const hit = this.pickForMinute(map, key, cfg);
      if (hit) return { ...hit, resolvedMinute: key };
      m -= 1;
      if (m < 0) { m = 59; h = (h + 23) % 24; }
    }
    return null;
  },

  reply(payload, body) {
    this.sendSocketNotification("LITCLOCK_QUOTE", {
      identifier: payload.identifier,
      id: payload.id,
      time: payload.time,
      ...body,
    });
  },

  socketNotificationReceived(notification, payload) {
    if (notification !== "LITCLOCK_GET") return;
    const cfg = payload.config || {};

    let map;
    try {
      map = this.load(this.resolvePath(cfg.dataFile));
    } catch (err) {
      console.error(`[MMM-LiteraryClock] failed to load dataset: ${err.message}`);
      this.reply(payload, { error: err.message });
      return;
    }

    const hit = this.resolve(map, payload.time, cfg);
    if (!hit || hit.resolvedMinute !== payload.time) {
      this.reply(payload, { fallback: true });
      return;
    }

    const split = this.splitQuote(hit.quote, hit.phrase);
    this.reply(payload, {
      before: split.before,
      timePhrase: split.time,
      after: split.after,
      title: hit.title,
      author: hit.author,
    });
  },
});
