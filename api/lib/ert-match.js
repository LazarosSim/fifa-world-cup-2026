// api/lib/ert-match.js
const { EN_TO_EL, normalizeGreek } = require("./ert-teams");

const WINDOW_BEFORE_MS = 60 * 60 * 1000; // pre-show can start up to 60 min early
const WINDOW_AFTER_MS = 20 * 60 * 1000;  // ...or a few min after kickoff

const titleHasTeam = (normTitle, englishName) => {
  const forms = EN_TO_EL[englishName];
  if (!forms) return false;
  return forms.some((g) => normTitle.includes(normalizeGreek(g)));
};

function resolveChannel(match, programmes) {
  const kickoff = new Date(match.kickoffISO).getTime();
  if (!Number.isFinite(kickoff) || !Array.isArray(programmes)) return "ΕΡΤ";

  const channels = new Set();
  for (const p of programmes) {
    const start = new Date(p.startISO).getTime();
    if (!Number.isFinite(start)) continue;
    if (start < kickoff - WINDOW_BEFORE_MS) continue;
    if (start > kickoff + WINDOW_AFTER_MS) continue;

    const normTitle = normalizeGreek(p.titleEl);
    if (titleHasTeam(normTitle, match.homeTeam) && titleHasTeam(normTitle, match.awayTeam)) {
      channels.add(p.channel);
    }
  }

  return channels.size === 1 ? [...channels][0] : "ΕΡΤ";
}

module.exports = { resolveChannel };
