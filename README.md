# CIO Toolkit Dashboard (modular, v5)

Plain HTML, CSS and JavaScript modules. No framework, no build step. All data is illustrative.

## Run it
The page loads JSON with `fetch`, so it needs a web server (opening the file directly will not work).
- `python -m http.server` or `npx serve .` in this folder, then open http://localhost:8000
- Browser tests (no Node needed): open http://localhost:8000/tests/browser.html (data, rendering, contrast) and http://localhost:8000/tests/e2e.html (keyboard, dialogs, roles, saved statuses)
- Node checks: `node tests/check.mjs`

## What is in it
- Role views: CIO cockpit, Finance, Operations, Delivery, Security, AI and Data
- Act group: Decision log (editable status, saved in the browser) and Board pack (printable draft)
- Every tile shows status and the change since the previous period. Select a tile for its evidence (owner, source, and more detail, including the AI position of the KPI)
- A briefing banner at the top of each view. "Ask a question" jumps to the Ask panel
- Ask the dashboard answers with sources, or refuses by role
- Accessibility: keyboard tabs (arrow keys), text status on everything, contrast-tested colours. See docs/RESEARCH.md for the research behind these choices

## What v5 is built on
v5 is organised around research into how serious technology reporting is done (CIO.com 3D scoreboard, TBM, FinOps, DORA, Google SRE, IBCS). See docs/RESEARCH.md for the sources, how reliable each is, the gap analysis, and what a real setup needs. In short: outcomes first, then decisions, then drivers; reliability expressed as an error budget with a release policy; a year-end forecast against plan in IBCS notation; a waterfall that explains a variance; DORA measures read together and not set as targets; AI benefit labelled measured or estimated next to spend.

## Design intent (v4)
A leader should get the answer, the numbers and the decisions without scrolling, on a laptop and on a phone. The chrome is one line of context, tiles carry plain language (catalogue IDs live in the evidence dialog), and no number is shown twice on a screen. Tests lock this in: tests/e2e.html checks what is visible above the fold.

## Design decisions in v4
- The AI value of a KPI is explained in the evidence dialog, not as a badge on every tile.
- There is no period selector. The change arrows already compare with the previous week or month, and a selector that changed only the tiles would mislead.
- A small "Ask a question" link jumps to the Ask panel instead of moving the panel above the decisions.

## How it is organised
- `config/views.json`: each view is a list of blocks (briefing, section, tiles, services, errorbudget, chart, table, row, note, ask, doc; chart kinds: line, bar, hbar, scenario, waterfall)
- `config/roles.json`: roles, and which roles can see which data domain
- `data/Kxx.json`: one file per KPI (series, metrics, markers, owner, source). `data/datasets/`: tables
- `components/`: pure functions that turn data into HTML. They never fetch data
- `data-access.js`: the only file that knows where data comes from (swap it for an API later)

## Add a KPI tile to a view
1. Run `python tools/build-kpis.py <catalogue.xlsx>` so `config/kpis.json` has the KPI.
2. Add `data/Kxx.json` (use an `Xnn` id and `proposed: true` for a KPI that is not in the catalogue) with `domain`, `owner`, `source`, and metrics. Each tile metric needs `prior` (the previous week or month, used for the change arrow), `polarity` (up or down is better) and `note`. List the file in `data/index.json`.
3. Add `{ "kpi": "Kxx", "metric": "..." }` to a `tiles` block in `config/views.json`.
4. Run the browser tests.

## Add a view
Add an entry to `config/views.json` with `id`, `name`, `roles`, `accessText` and `blocks`. Add `"group": "Act"` to place it after the separator.

## Notes
- Numbers are stored once. Use tokens in text: `{{K17:mttr:last}}` (series) or `{{K07:vsW8}}` (metric).
- Refusals in Ask follow the selected role, not the view. Try the finance role on the vulnerability question.
- The role switcher is a demo. Real access control must come from sign-in and be enforced on a server.
