/* global Module */

/* MagicMirror² Module: MMM-LiteraryClock
 * A literary clock — every minute it shows a passage from a book that
 * mentions the current time, with the time phrase emphasised.
 *
 * Data: JohsEnevoldsen/literature-clock, crowd-sourced by The Guardian,
 * original idea by Jaap Meijers. Bundled as litclock_annotated.csv.
 */
Module.register("MMM-LiteraryClock", {
  defaults: {
    fontSize: 28,          // px — size of the quote body
    maxWidth: "34em",      // measure of the text block (relative to fontSize)
    quoteColor: "#736e62", // body text — kept dim so the time phrase pops
    timeColor: "#fbf9f4",  // the emphasised time phrase
    attributionColor: "#8f8b82", // the "— Title, Author" line
    updateOnMinute: true,  // refresh exactly on the minute boundary
    refreshMinutes: 1,     // if updateOnMinute is false, refresh every N minutes
    fadeSpeed: 1500,       // ms crossfade when the quote changes
    showAttribution: true, // show "— Title, Author"
    allowNSFW: false,      // include quotes flagged nsfw
    allowUnknown: true,    // include quotes with an unrated (unknown) flag
    dataFile: "",          // path to an alternative dataset (blank = bundled English CSV)
  },

  getStyles() {
    return [this.file("MMM-LiteraryClock.css")];
  },

  start() {
    this.quote = null;      // { before, timePhrase, after, title, author }
    this.reqId = 0;
    this.requestQuote();
    this.scheduleUpdate();
  },

  // Ask the node_helper for a quote matching the current HH:MM.
  requestQuote() {
    const now = new Date();
    const time = `${this.pad(now.getHours())}:${this.pad(now.getMinutes())}`;
    this.reqId += 1;
    this.sendSocketNotification("LITCLOCK_GET", {
      identifier: this.identifier,
      id: this.reqId,
      time,
      config: {
        allowNSFW: this.config.allowNSFW,
        allowUnknown: this.config.allowUnknown,
        dataFile: this.config.dataFile,
      },
    });
  },

  scheduleUpdate() {
    const now = new Date();
    let ms;
    if (this.config.updateOnMinute) {
      ms = (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 60;
    } else {
      ms = Math.max(1, this.config.refreshMinutes) * 60 * 1000;
    }
    setTimeout(() => {
      this.requestQuote();
      this.scheduleUpdate();
    }, ms);
  },

  socketNotificationReceived(notification, payload) {
    if (notification !== "LITCLOCK_QUOTE") return;
    if (payload.identifier !== this.identifier) return; // another instance's reply
    if (payload.id !== this.reqId) return; // stale reply
    if (payload.error) {
      this.quote = { error: true };
      this.updateDom(0);
      return;
    }
    if (payload.fallback) {
      this.quote = { fallback: true, time: payload.time };
    } else {
      this.quote = {
        before: payload.before,
        timePhrase: payload.timePhrase,
        after: payload.after,
        title: payload.title,
        author: payload.author,
      };
    }
    this.updateDom(this.config.fadeSpeed);
  },

  pad(n) {
    return String(n).padStart(2, "0");
  },

  esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },

  // Escape text, then restore the dataset's intentional <br/> tags.
  render(s) {
    return this.esc(s).replace(/&lt;br\s*\/?&gt;/gi, "<br/>");
  },

  getDom() {
    const wrap = document.createElement("div");
    wrap.className = "litclock-wrap";
    wrap.style.fontSize = `${this.config.fontSize}px`;
    wrap.style.maxWidth = this.config.maxWidth;
    wrap.style.setProperty("--litclock-quote-color", this.config.quoteColor);
    wrap.style.setProperty("--litclock-time-color", this.config.timeColor);
    wrap.style.setProperty("--litclock-attr-color", this.config.attributionColor);

    if (!this.quote) {
      wrap.classList.add("litclock-loading");
      wrap.innerHTML = '<span class="litclock-quote">&hellip;</span>';
      return wrap;
    }

    if (this.quote.error) {
      wrap.classList.add("litclock-error");
      wrap.innerHTML = '<span class="litclock-quote">MMM-LiteraryClock: could not load the quote dataset (check <code>dataFile</code>).</span>';
      return wrap;
    }

    if (this.quote.fallback) {
      wrap.innerHTML = `<span class="litclock-fallback">${this.esc(this.quote.time)}</span>`;
      return wrap;
    }

    const q = document.createElement("div");
    q.className = "litclock-quote";
    q.innerHTML =
      this.render(this.quote.before) +
      '<span class="litclock-time">' +
      this.render(this.quote.timePhrase) +
      "</span>" +
      this.render(this.quote.after);
    wrap.appendChild(q);

    if (this.config.showAttribution && (this.quote.title || this.quote.author)) {
      const attr = document.createElement("div");
      attr.className = "litclock-attr";
      attr.innerHTML =
        "&mdash;&nbsp;" +
        `<span class="litclock-title">${this.esc(this.quote.title)}</span>` +
        (this.quote.author ? `, <span class="litclock-author">${this.esc(this.quote.author)}</span>` : "");
      wrap.appendChild(attr);
    }

    return wrap;
  },
});
