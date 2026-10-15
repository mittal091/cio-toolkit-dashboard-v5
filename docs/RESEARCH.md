# Research behind the CIO Toolkit Dashboard

Written for whoever maintains the dashboard and has to defend its content. All dashboard data is illustrative.

## Why this was redone
Earlier versions were checked for polish (layout, contrast, keyboard use) but not for substance. The research below asks a different question: what do serious technology reporting frameworks say a CIO should show, and how should the numbers lead to a decision? v5 changes content and decision logic, not only appearance.

## How reliable each source is
| Source | How it was used |
|---|---|
| CIO.com, "The CIO's scoreboard" (3D framework) | Read in full |
| TBM Council, KPI page (33 KPIs with formulas) | Read in full, except the last third of a long page |
| DORA, the five software delivery metrics | Read in full |
| Google SRE book, "Embracing Risk" (error budgets) | Read in full |
| IBCS standards page (SUCCESS rules) | Read in full |
| FinOps Foundation, Forecasting and Unit Economics | Read in full |
| W3C pages (tabs, contrast, non-text contrast, target size) | Read in full |
| Gartner Digital Execution Scorecard | Page blocked (403). Only search-result abstracts seen |
| NIST CSF 2.0 | Secondary summaries only. The official text was not read |
| Tableau Pulse | Vendor and partner pages only |
| AI value realization | Practitioner and vendor guides only. Several statistics are unverified |
| Stephen Few's bullet graph specification | PDF could not be read. Not used |
| Dashboard-adoption articles | Vendor and consultancy blogs. Statistics unverified, so only qualitative points are used |

## Findings

### 1. Lead with outcomes, not telemetry (CIO.com 3D scoreboard)
Three tiers, each for a different question. **Boardroom outcomes** ("are we winning?"): strategic portfolio delivered on time and on value, grow versus run spend, time to market, automation ROI, quantified technical debt. **Diagnostics** shared with the business ("how are we winning?"). **Drivers** ("is the machine running?"): cycle time, SLO attainment, MTTR, time to remediate critical vulnerabilities, change fail rate. The article lists uptime percentages, ticket counts and deployment counts as vanity metrics, and says to translate activity into outcomes and to tell the chain from driver to outcome.
**Consequence for the dashboard:** v4's cockpit headlined an uptime percentage, an incident count and a deployment count. v5's cockpit tiles are outcomes and the drivers sit in their own section.

### 2. Turn a reliability number into a decision (Google SRE)
An SLO target leaves an error budget, the unreliability a service is allowed. Past 100% of the budget, releases pause until reliability work restores it. "100% is probably never the right reliability target." **Consequence:** the cockpit and Operations show error budget used per service (Payments 240%, Customer portal 120%) and the release policy, instead of raw availability. The service owner decides.

### 3. Do not misuse delivery metrics (DORA)
Five measures: change lead time, deployment frequency, failed deployment recovery time (throughput), change fail rate, deployment rework rate (instability). DORA says not to set them as targets, not to blend them across teams, to apply them per service, and to use several with healthy tension. **Consequence:** Delivery no longer headlines a deployment count. It shows change fail rate and recovery time for the Payments platform with no targets, and shows deployments beside the failure rate so speed and stability are read together. These two measures are proposed KPIs (ID X01), flagged as not in the catalogue.

### 4. Show the forecast, not only the year to date (FinOps, TBM)
FinOps defines forecast accuracy as (Forecast minus Actual) divided by Forecast and tracks forecast drift between versions. Maturity runs from manual (Crawl) to rolling trend-based (Walk) to driver-based (Run). TBM lists budget variance, forecast accuracy and Run/Grow/Transform mix as core KPIs. **Consequence:** the year-end landing ($124.0M against a $120.0M plan) is a rolling trend-based forecast with its method stated. The arrow on the tile is forecast drift. Forecast accuracy cannot be reported until forecasts have been saved for a few months.

### 5. Pair spend with value, and label evidence honestly (FinOps, AI value guidance)
FinOps: lead with business unit metrics and pair spend with value. AI value guidance: set baselines before go-live, and label every benefit measured or estimated. **Consequence:** the AI view shows measured benefit ($1.3M, two use cases with a documented baseline) next to estimated benefit ($1.6M, no baseline) and next to $2.50M a year of AI spend. A test enforces that no benefit counts as measured without a documented baseline.

### 6. Management-reporting standards (IBCS)
Put the message at the top. Every title names the measure, unit and period. Use standard notation for actual (AC), plan (PL) and forecast (FC). Use the same colours for good and bad variances. Show variances as numbers and use a waterfall to explain root causes. Columns start at zero. **Consequence:** a plan-against-actual chart in AC/FC/PL notation with variance pins, a waterfall that explains why cloud cost is 7% above week 8, and period-bearing titles checked by a test.

### 7. Insight engines need business context (Tableau Pulse)
Pulse's metrics layer stores whether an increase is favourable, and generates a ranked "what changed and why". The dashboard already stores that favourable direction (polarity) and uses it to colour every change arrow. It does not yet generate the ranked insights. See "Not done".

### 8. Why dashboards go unused
Qualitative points repeated across sources: too many metrics, numbers without target or context, conflicting definitions, and no timestamp. Executives want exceptions first and a narrative. v4 and v5 act on these (banner message, decisions first, one number per fact, owner and definition in the evidence dialog, "data as of").

## Gap analysis
Coverage of the metrics the frameworks name. "Added" means present in v5 as dummy data.

| Metric (framework) | Status |
|---|---|
| Roadmap delivered on time (CIO.com) | Have (K03). "On value" is missing |
| Year-end landing and budget variance (TBM, FinOps) | Added |
| Forecast drift (FinOps) | Added |
| Forecast accuracy (TBM, FinOps) | Missing: needs saved past forecasts |
| Run / Grow / Transform mix (TBM, CIO.com) | Missing |
| Tech spend as % of revenue (TBM) | Have (K05) |
| Unit costs, cost per transaction (TBM, FinOps) | Missing: needs volume data |
| Spend tied to strategic initiatives (TBM) | Missing |
| Cloud cost per solution (TBM) | Missing |
| Cost per AI inference, training versus inference (TBM) | Missing |
| AI benefit measured versus estimated, spend paired with value | Added |
| Error budget and release policy (SRE) | Added |
| Change fail rate, failed deployment recovery (DORA) | Added as proposed KPI X01 |
| Change lead time, deployment rework rate (DORA) | Missing |
| Deployment frequency (DORA) | Have (K11), demoted to a driver chart |
| Time to remediate critical vulnerabilities (CIO.com) | Missing |
| Quantified technical debt and cyber exposure in money (CIO.com, NIST CSF) | Missing |
| Cybersecurity coverage per solution, audit readiness (TBM) | Partly (K24 overdue findings) |
| Time to market, automation ROI (CIO.com) | Missing |
| Business satisfaction | Missing |

## Not done, and why
- **Generated insights ("what moved most and why"):** the pattern is clear, but a ranking engine needs real, attributable data. Worth building once a real metrics layer exists.
- **Status computed from thresholds:** statuses are still entered with the metric. A real setup should compute them from target and tolerance and show the rule.
- **Scenario planner, benchmarks:** not core to the questions a leader asks weekly.
- **Metrics with no honest dummy source** (technical debt in money, unit cost): listed as gaps rather than invented.

## What a real setup needs, beyond the earlier list
1. A metrics layer that stores each KPI's definition, favourable direction, target and thresholds, so status and change arrows are computed.
2. Saved forecasts, so forecast accuracy and drift are real.
3. A benefits register with baselines, owners and a measured or estimated label, validated by Finance.
4. SLOs agreed per service with the business, with the release policy owned by the service owner.
5. DORA measures collected per service from the deployment and incident systems, with no targets.
6. Sign-in and server-side access control, a real Ask service that cites sources, private hosting, and an audit trail.

## Sources
- [The CIO's scoreboard: Measuring what really matters (CIO.com)](https://www.cio.com/article/4098704/the-cios-scoreboard-measuring-what-really-matters.html)
- [TBM Council: KPIs and metrics](https://www.tbmcouncil.org/learn-tbm/tbm-modeling/kpi-metric/)
- [TBM Council: Taxonomy](https://www.tbmcouncil.org/taxonomy/)
- [DORA: the software delivery metrics](https://dora.dev/guides/dora-metrics/)
- [Google SRE book: Embracing Risk](https://sre.google/sre-book/embracing-risk/)
- [IBCS: International Business Communication Standards](https://www.ibcs.com/IBCS/)
- [FinOps Foundation: Forecasting](https://www.finops.org/framework/capabilities/forecasting/)
- [FinOps Foundation: Unit Economics](https://www.finops.org/framework/capabilities/unit-economics/)
- [Gartner: Digital Execution Scorecard](https://www.gartner.com/en/chief-information-officer/research/digital-execution-scorecard) (abstract only)
- [Tableau Pulse](https://www.tableau.com/en-gb/metrics) (vendor page)
- [W3C: ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [WCAG 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- Reference prototype: [subratatec1/cio-cto-cockpit](https://github.com/subratatec1/cio-cto-cockpit) (no licence, ideas only)
