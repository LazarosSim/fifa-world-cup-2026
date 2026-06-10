# Greek (ERT) Broadcast Channel per Match — Design

**Date:** 2026-06-10
**Status:** Approved, pending implementation plan

## Problem

The match cards currently show US broadcasters (FOX / Telemundo / FS1) in the
`stream` field. For a Greek audience we want the corresponding Greek channel.

The live feed (`api/feed.js`) derives `stream` from ESPN's `comp.broadcasts`,
which only carries US/regional networks. There is no Greek field to swap to —
we need a separate Greek source.

## Key fact establishing the broadcaster

**ERT holds the exclusive Greek rights to FIFA World Cup 2026** — all 104 matches
free-to-air across **ERT1, ERT2, ERT3, ERT Sports** (plus ERTFLIX streaming).
COSMOTE SPORT and ANT1 do **not** carry the tournament. So the channel we display
must be an ERT channel, not COSMOTE.

## Source

No clean keyless JSON EPG exists for ERT (iptv-org has no ERT grabber). The proven
route is HTML-scraping ERT's program pages at `https://www.ert.gr/tv/program/`
(the approach used by the `chrisliatas/greek-xmltv` project).

The per-match channel assignment is effectively **static once ERT announces it** —
it does not change minute-to-minute like the live score. This drives the two-tier
caching below.

## Architecture

Two cache tiers, because score data and channel data change at very different rates.

### `api/ert-channels.js` (new serverless route)

- Scrapes ERT program pages for **ERT1, ERT2, ERT3, ERT Sports** across the
  tournament window.
- Returns a normalized JSON array: `[{ startISO, channel, titleEl }]`
  - `startISO` — programme start, ISO 8601 UTC
  - `channel` — display label, e.g. `"ERT1"`, `"ERT Sports"`
  - `titleEl` — the Greek programme title (used for team matching)
- Cache: `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`
  → ERT is scraped at most ~once per hour regardless of traffic, the same
  flat-upstream-load principle the ESPN proxy already uses.
- On scrape failure: return `[]` with a short cache (`s-maxage=300`) so we retry
  soon; downstream degrades to the generic `"ΕΡΤ"` label.

### `api/feed.js` (modified)

Score-building logic is unchanged. After `matches` is built:

1. Fetch `/api/ert-channels` **same-origin, server-side** (so it hits that route's
   1-hour CDN cache, not ERT directly).
2. For each match, resolve its ERT channel via the matcher (below) and write the
   result into the existing `match.stream` field.
3. If the fetch throws or returns `[]`, every match's `stream` becomes `"ΕΡΤ"`.

The feed's own cache stays `s-maxage=60`. Because it reads `ert-channels` through
the CDN, the 60s feed rebuild does **not** trigger an ERT scrape each time.

### Front-end (`index.html`)

- Live rendering: **no change** — the card already renders `m.stream`.
- Offline fallback: the hardcoded built-in schedule currently has
  `stream: "FOX / Telemundo"` etc. Switch all of those to `"ΕΡΤ"` so the offline
  state shows the correct broadcaster instead of US channels.

## The matcher (pure function)

ESPN provides English team names + kickoff time (UTC). ERT titles are Greek, e.g.
`Παγκόσμιο Κύπελλο 2026: Αργεντινή - Βραζιλία`.

- **`EN_TO_EL` table** — static map of the 48 World Cup team names
  (English → Greek). The canonical English names already exist in the front-end
  flag map, so the set is bounded and known.
- **Resolution per match:**
  1. Filter ERT programmes to those whose `startISO` is within ~±20 minutes of
     the match kickoff.
  2. Among those, keep programmes whose `titleEl` contains **both** teams' Greek
     names (accent-insensitive substring match).
  3. If exactly one distinct channel remains → that's the channel.
  4. Zero matches, or more than one distinct channel → fallback `"ΕΡΤ"`.
- No network access; fully unit-testable.

## Error handling / graceful degradation

Every failure path lands on the generic `"ΕΡΤ"` label (correct broadcaster, no
sub-channel number) and **never breaks the score feed**:

| Failure | Result |
|---|---|
| ERT scrape fails | `ert-channels` returns `[]` → all matches show `"ΕΡΤ"` |
| `feed.js` can't reach `ert-channels` | caught → `"ΕΡΤ"` everywhere |
| Match unresolved (not yet slotted / ambiguous) | `"ΕΡΤ"` for that match |
| Whole feed unavailable | front-end offline fallback, now also `"ΕΡΤ"` |

## Testing

The repo has no test harness today. Add a minimal `node:test` file covering the
matcher only (pure function, no network):

- A fixture programme matching one fixture → asserts the correct channel.
- Ambiguous case (two channels plausibly match) → asserts `"ΕΡΤ"`.
- No-match case → asserts `"ΕΡΤ"`.
- Accent-insensitivity check.

## Known limits (accepted by design)

- ERT publishes channel splits closer to matchday; far-out fixtures show `"ΕΡΤ"`
  until ERT slots them. This is the intended graceful behavior.
- ERT may spin up temporary "ERT Sports" pop-up channels for simultaneous matches
  during the tournament; the scrape includes them if ERT lists them, otherwise
  those matches fall back to `"ΕΡΤ"`.
- HTML scraping is inherently brittle; it is quarantined in `api/ert-channels.js`
  so an ERT layout change degrades to `"ΕΡΤ"` and never affects the score feed.

## Out of scope (YAGNI)

- No generic/ reusable EPG library — only enough to resolve World Cup fixtures.
- No COSMOTE / ANT1 sources (they do not broadcast the tournament).
- No knockout-bracket channel resolution beyond what the same matcher yields once
  fixtures are concrete.
