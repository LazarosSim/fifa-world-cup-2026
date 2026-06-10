// test/ert-teams.test.js
const test = require("node:test");
const assert = require("node:assert");
const { EN_TO_EL, normalizeGreek } = require("../api/lib/ert-teams");

test("normalizeGreek lowercases and strips accents", () => {
  assert.equal(normalizeGreek("Αργεντινή"), "αργεντινη");
  assert.equal(normalizeGreek("ΒΡΑΖΙΛΊΑ"), "βραζιλια");
});

test("every team maps to at least one Greek form", () => {
  const names = Object.keys(EN_TO_EL);
  assert.equal(names.length, 48);
  for (const n of names) {
    assert.ok(Array.isArray(EN_TO_EL[n]) && EN_TO_EL[n].length >= 1, `${n} has forms`);
  }
});

test("known mappings are present", () => {
  assert.ok(EN_TO_EL["Argentina"].includes("Αργεντινή"));
  assert.ok(EN_TO_EL["United States"].some((g) => g === "ΗΠΑ"));
});
