// api/ert-channels.js
// Scrapes ERT's per-channel programme pages and returns a normalised programme
// list for the next few days. Cached hard (1h) so ERT is hit at most ~once/hour
// regardless of visitor volume — the same flat-load principle as /api/feed.
const { parseErtProgram } = require("./lib/ert-parse");

const CHANNELS = [
  { slug: "ert1", label: "ΕΡΤ1" },
  { slug: "ert2", label: "ΕΡΤ2" }, // ΕΡΤ2 ΣΠΟΡ — the sports channel
  { slug: "ert3", label: "ΕΡΤ3" },
];
const WINDOW_DAYS = 4; // today + 3 — only near-term matches need a specific channel

// Athens-local YYYY-MM-DD for today + offsetDays.
function athensYmd(offsetDays) {
  const base = new Date(Date.now() + offsetDays * 86400000);
  return base.toLocaleDateString("en-CA", { timeZone: "Europe/Athens" }); // en-CA → YYYY-MM-DD
}

const pageUrl = (slug, ymd) =>
  `https://www.ert.gr/tv/program/${slug}/?date=${ymd}`;

async function fetchOne(slug, label, ymd) {
  try {
    const res = await fetch(pageUrl(slug, ymd), {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html" },
    });
    if (!res.ok) return [];
    return parseErtProgram(await res.text(), label, ymd);
  } catch {
    return [];
  }
}

async function buildProgrammes() {
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) => athensYmd(i));
  const jobs = [];
  for (const ymd of days) {
    for (const ch of CHANNELS) jobs.push(fetchOne(ch.slug, ch.label, ymd));
  }
  return (await Promise.all(jobs)).flat();
}

module.exports = async (req, res) => {
  try {
    const programmes = await buildProgrammes();
    res.setHeader(
      "Cache-Control",
      programmes.length === 0
        ? "public, s-maxage=300"
        : "public, s-maxage=3600, stale-while-revalidate=86400"
    );
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json({ programmes });
  } catch {
    res.setHeader("Cache-Control", "public, s-maxage=300");
    res.status(200).json({ programmes: [] });
  }
};
