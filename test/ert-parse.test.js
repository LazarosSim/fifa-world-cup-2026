// test/ert-parse.test.js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { parseErtProgram } = require("../api/lib/ert-parse");

// Minimal synthetic HTML matching real ERT structure
const synthetic = `
<article data-start-time="2026-06-11 16:00:00+0300" data-end-time="2026-06-11 18:00:00+0300" class="broadcast">
  <strong class="section-title fs-lg">Παγκόσμιο Κύπελλο 2026: Μεξικό - Καναδάς</strong>
</article>
<article data-start-time="2026-06-11 19:00:00+0300" data-end-time="2026-06-11 21:00:00+0300" class="broadcast">
  <strong class="section-title fs-lg">Κεντρικό Δελτίο Ειδήσεων</strong>
</article>`;

test("parses data-start-time and section-title into UTC ISO entries", () => {
  const out = parseErtProgram(synthetic, "ΕΡΤ1", "2026-06-11");
  assert.equal(out.length, 2);
  assert.equal(out[0].channel, "ΕΡΤ1");
  assert.ok(out[0].titleEl.includes("Μεξικό"), "title should include Μεξικό");
  // 16:00 Athens (EEST, UTC+3) == 13:00 UTC
  assert.equal(out[0].startISO, "2026-06-11T13:00:00.000Z");
});

test("returns [] for junk input (never throws)", () => {
  assert.deepEqual(parseErtProgram("<html></html>", "ΕΡΤ1", "2026-06-11"), []);
  assert.deepEqual(parseErtProgram(null, "ΕΡΤ1", "2026-06-11"), []);
});

test("handles the real captured fixture", () => {
  const html = fs.readFileSync(path.join(__dirname, "fixtures/ert-sample.html"), "utf8");
  const out = parseErtProgram(html, "ΕΡΤ1", "2026-06-11");
  assert.ok(out.length > 0, "fixture yields entries");
  for (const e of out) {
    assert.match(e.startISO, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.equal(typeof e.titleEl, "string");
    assert.ok(e.titleEl.length > 0, "title is non-empty");
    assert.equal(e.channel, "ΕΡΤ1");
  }
});
