# ERT source notes

Confirmed via live DOM inspection of ert.gr on 2026-06-10.

- Channel page: https://www.ert.gr/tv/program/<slug>/  (slugs: ert1, ert2, ert3)
- ert2 is the sports channel ("ΕΡΤ2 ΣΠΟΡ").
- Dated URL: https://www.ert.gr/tv/program/ert1/?date=YYYY-MM-DD  (path-based 404s)
- Article selector: article[data-start-time]  (class "broadcast rel bb p-2")
- data-start-time format: "2026-06-10 06:45:00+0300"  (Athens local, explicit +0300 offset)
- data-end-time format: same
- Title element: <strong class="section-title fs-lg">Title text</strong>
- Times are Athens local with explicit UTC offset — parse directly via new Date(s.replace(' ','T'))
- ymdAthens param in parseErtProgram is kept for interface compat; NOT needed for time parsing
  (the timestamp already embeds the full date+offset)
