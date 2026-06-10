// test/ert-match.test.js
const test = require("node:test");
const assert = require("node:assert");
const { resolveChannel } = require("../api/lib/ert-match");

const fixture = (kickoffISO, home, away) => ({
  kickoffISO,
  homeTeam: home,
  awayTeam: away,
});

const programmes = [
  { startISO: "2026-06-11T18:45:00.000Z", channel: "ΕΡΤ1", titleEl: "Παγκόσμιο Κύπελλο 2026: Αργεντινή - Βραζιλία" },
  { startISO: "2026-06-11T18:55:00.000Z", channel: "ΕΡΤ2", titleEl: "Παγκόσμιο Κύπελλο 2026: Γαλλία - Ισπανία" },
  { startISO: "2026-06-11T05:00:00.000Z", channel: "ΕΡΤ1", titleEl: "Πρωινή ενημέρωση" },
];

test("resolves a match to its channel by time + both team names", () => {
  const m = fixture("2026-06-11T19:00:00.000Z", "Argentina", "Brazil");
  assert.equal(resolveChannel(m, programmes), "ΕΡΤ1");
});

test("uses the kickoff window (pre-show 15 min before counts)", () => {
  const m = fixture("2026-06-11T19:00:00.000Z", "France", "Spain");
  assert.equal(resolveChannel(m, programmes), "ΕΡΤ2");
});

test("falls back to ΕΡΤ when no programme matches", () => {
  const m = fixture("2026-06-12T16:00:00.000Z", "Germany", "Japan");
  assert.equal(resolveChannel(m, programmes), "ΕΡΤ");
});

test("falls back to ΕΡΤ when both teams are not in one title", () => {
  const m = fixture("2026-06-11T19:00:00.000Z", "Argentina", "Spain");
  assert.equal(resolveChannel(m, programmes), "ΕΡΤ");
});

test("ambiguous (two channels both plausible) -> ΕΡΤ", () => {
  const dup = programmes.concat([
    { startISO: "2026-06-11T18:50:00.000Z", channel: "ΕΡΤ3", titleEl: "Αργεντινή εναντίον Βραζιλία" },
  ]);
  const m = fixture("2026-06-11T19:00:00.000Z", "Argentina", "Brazil");
  assert.equal(resolveChannel(m, dup), "ΕΡΤ");
});
