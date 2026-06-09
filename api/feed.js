// Vercel serverless function: /api/feed
//
// Aggregates ESPN's (unofficial, key-free) FIFA World Cup endpoints, normalises
// them to the shape the front-end already expects, and serves the result with a
// CDN cache. Because the response is edge-cached (s-maxage), ESPN is queried at
// most about once per minute in total — independent of how many visitors load
// the page. 1,000 or 1,000,000 daily visitors produce the same upstream load.

const SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=300";
const STANDINGS =
  "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings";

// ESPN spells a handful of nations differently than the front-end's flag map.
// Normalising here keeps flags and group lookups correct everywhere.
const NAME_ALIASES = {
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Korea Republic": "South Korea",
  "Turkey": "Türkiye",
  "Cabo Verde": "Cape Verde",
  "Côte d'Ivoire": "Ivory Coast",
  "IR Iran": "Iran",
  "DR Congo": "Congo DR",
  "Czech Republic": "Czechia",
  "USA": "United States",
};
const canon = (name) => NAME_ALIASES[name] || name;

const ATHENS = "Europe/Athens";
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", {
    timeZone: ATHENS, month: "long", day: "numeric", year: "numeric",
  });
const fmtTime = (iso) => {
  const t = new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: ATHENS, hour: "2-digit", minute: "2-digit", hour12: false,
  });
  return `${t} EEST`;
};

const STATE = { pre: "Scheduled", in: "Live", post: "FT" };
const stat = (entry, name) => {
  const s = (entry.stats || []).find((x) => x.name === name);
  return s ? Number(s.value) || 0 : 0;
};

async function buildFeed() {
  const [sb, st] = await Promise.all([
    fetch(SCOREBOARD).then((r) => r.json()),
    fetch(STANDINGS).then((r) => r.json()),
  ]);

  // --- Official standings -> app `groups` + a team -> group lookup ---
  const groups = [];
  const teamGroup = {};
  for (const g of st.children || []) {
    const teams = (g.standings?.entries || []).map((en) => {
      const team = canon(en.team?.displayName || "");
      teamGroup[team] = g.name;
      return {
        rank: stat(en, "rank"),
        team,
        played: stat(en, "gamesPlayed"),
        won: stat(en, "wins"),
        drawn: stat(en, "ties"),
        lost: stat(en, "losses"),
        goalsFor: stat(en, "pointsFor"),
        goalsAgainst: stat(en, "pointsAgainst"),
        points: stat(en, "points"),
      };
    });
    groups.push({ groupName: g.name, teams });
  }

  // --- Scoreboard -> group-stage matches (chronological) ---
  const events = (sb.events || [])
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const matches = [];
  for (const e of events) {
    const comp = e.competitions?.[0];
    if (!comp) continue;
    const cs = comp.competitors || [];
    const h = cs.find((c) => c.homeAway === "home");
    const a = cs.find((c) => c.homeAway === "away");
    if (!h || !a) continue;

    const home = canon(h.team?.displayName || "");
    const away = canon(a.team?.displayName || "");
    // Keep only real group-stage fixtures (both teams placed in a group);
    // this drops the 32 knockout-bracket placeholders ("Group A Winner", etc.).
    if (!teamGroup[home] || !teamGroup[away]) continue;

    const state = e.status?.type?.state || "pre";
    const venueName = comp.venue?.fullName || "Championship Stadium";
    const city = comp.venue?.address?.city || "";
    const stream = (comp.broadcasts || []).flatMap((b) => b.names || []).slice(0, 2).join(" / ");

    matches.push({
      id: e.id,
      homeTeam: home,
      homeFlag: null,
      awayTeam: away,
      awayFlag: null,
      homeScore: state === "pre" ? null : parseInt(h.score, 10),
      awayScore: state === "pre" ? null : parseInt(a.score, 10),
      matchDate: fmtDate(e.date),
      matchTime: fmtTime(e.date),
      venue: city ? `${venueName}, ${city}` : venueName,
      group: teamGroup[home] || teamGroup[away],
      status: STATE[state] || "Scheduled",
      minute: state === "in" ? (e.status?.type?.shortDetail || comp.status?.displayClock || null) : null,
      stream: stream || "—",
    });
  }

  const live = matches.some((m) => m.status === "Live");
  return {
    tournamentStatus: live ? "Matches in progress" : "Scheduled",
    matches,
    groups,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = async (req, res) => {
  try {
    const feed = await buildFeed();
    // Edge-cache for 60s; serve stale up to 5 min while revalidating. This is
    // what keeps ESPN's load flat regardless of visitor volume.
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json(feed);
  } catch (err) {
    // Short cache on failure so we retry soon; the client falls back to its
    // built-in schedule when the feed is unavailable.
    res.setHeader("Cache-Control", "public, s-maxage=30");
    res.status(502).json({ error: "upstream_unavailable" });
  }
};

module.exports.buildFeed = buildFeed;
