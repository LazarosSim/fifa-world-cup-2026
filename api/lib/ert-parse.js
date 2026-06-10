// api/lib/ert-parse.js
//
// Parses ERT programme-listing HTML into normalised entries.
//
// Real ERT markup (confirmed 2026-06-10):
//   <article data-start-time="2026-06-11 16:00:00+0300" ...>
//     <strong class="section-title fs-lg">Title</strong>
//   </article>
//
// data-start-time is Athens local with explicit UTC offset — parseable directly.

// Extract (startTime, articleBody) pairs from article elements.
// Uses a simple stateful scan instead of nested regex to avoid ReDoS on large pages.
function parseErtProgram(html, label, _ymdAthens) {
  if (typeof html !== "string") return [];

  const out = [];

  // Match every <article ... data-start-time="TIMESTAMP" ...> opening tag.
  const articleOpenRe = /<article\b[^>]*\bdata-start-time="([^"]+)"[^>]*>/g;
  // Match <strong class="...section-title...">TITLE</strong>
  const titleRe = /<strong\b[^>]*class="[^"]*section-title[^"]*"[^>]*>([\s\S]*?)<\/strong>/;

  let match;
  while ((match = articleOpenRe.exec(html)) !== null) {
    const startStr = match[1]; // "2026-06-11 16:00:00+0300"

    // Grab a bounded slice of HTML after the opening tag (up to ~2 kB is plenty).
    const sliceStart = match.index + match[0].length;
    const sliceEnd = Math.min(sliceStart + 2000, html.length);
    const body = html.slice(sliceStart, sliceEnd);

    const titleMatch = body.match(titleRe);
    if (!titleMatch) continue;

    const titleEl = titleMatch[1].replace(/<[^>]*>/g, "").trim(); // strip any inner tags
    if (!titleEl) continue;

    let startISO;
    try {
      // "2026-06-11 16:00:00+0300" → "2026-06-11T16:00:00+0300" → valid ISO 8601
      startISO = new Date(startStr.replace(" ", "T")).toISOString();
    } catch {
      continue;
    }
    if (!startISO || startISO === "Invalid Date") continue;

    out.push({ startISO, channel: label, titleEl });
  }

  return out;
}

module.exports = { parseErtProgram };
