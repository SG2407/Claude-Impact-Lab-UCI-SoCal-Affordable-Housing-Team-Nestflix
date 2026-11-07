# NestFlix

> Bridging the Gap Between Housing Dreams and Funding Reality. A funding decision-support tool for the nonprofit finance lead who has to close the gap on an affordable ownership home.

**Team:** NestFlix
**Members:** _add names_
**Lane:** 3 Fund it
**Built at:** Claude Impact Lab: UCI × SoCal Affordable Housing, November 7, 2026

> **Prototype for educational and planning purposes. Not legal, tax, financial, or lending advice.** All project, household, donor and employer data is **SYNTHETIC**. Nothing is filed, sent or paid.

Event material (rules, lane briefs, data sources) lives in [`docs/`](docs/) and [`lanes/`](lanes/). Start at [`docs/getting-started.md`](docs/getting-started.md).

## The real user

A finance lead at a nonprofit affordable-housing developer. Every home has a gap: the cost to create it is far above what the family can pay, and the gap is closed by stacking subsidies, donors and employers by hand, project by project, with program lists that go stale.

**Before:** spreadsheets, scattered program pages, and no clean line between money that is promised and money that is secured.
**After:** one place that computes the gap, keeps proposed and confirmed money apart, lists sourced funding leads with what is still unknown, and shows how a donor, an employer or a mortgage-rate move changes the number.

Secondary portals (donor, buyer, employer) all feed the same shared project.

## What we built

A Next.js dashboard on a FastAPI financial engine (SQLite, no paid services).

| Portal | What works |
|---|---|
| **Overview** | Live metrics from the API, financing composition chart, links to every portal |
| **Builder** (primary) | Editable cost lines recalculated by the backend, gap calculator, funding simulator (donor/employer/grant), stacked funding chart, funding matcher, contribution status control, funding strategy + downloadable report |
| **Donor** | Contribution simulator with before/after gap, proposed allocation across cost lines, "Save Demo Pledge" (persisted as *proposed*), tax-deductibility caution |
| **Buyer** | Affordability calculator, interest-rate slider (payment capacity held fixed) with revised price and revised developer gap, buyer-to-project gap, sourced assistance leads |
| **Employer** | Single-employer simulator, multi-employer consortium (add/remove/combine), impact on the gap |
| **Sources & Assumptions** | REAL / SYNTHETIC / UNKNOWN, formulas, reference URLs, every program record with verification dates |

**Funding states.** Proposed and applied-for money only affects the *scenario gap*. Only **committed or disbursed** money reduces the *secured gap*. A saved pledge is always created as `proposed`; the finance lead confirms it with a separate explicit action. Status moves are one-way (`proposed → applied/committed`, `committed → disbursed`).

**Demo numbers (all ASSUMPTION, from `lanes/3-fund-it/data/synthetic-example-deal.json`).** Cost $535,000 = land/building $360,000 + time costs $85,000 + construction $40,000 + fees/design/legal/sales $50,000. Existing $440,000 = buyer price $285,000 + public subsidies $100,000 + earned revenue $55,000. Initial gap **$95,000**. Illustrative scenario: donor $25,000 + employer $40,000 + grant $30,000 = $95,000 proposed → scenario gap $0 ("Scenario fully funded — commitments and eligibility still require verification"). That arithmetic does not mean any commitment exists.

## How Claude is used

Claude is **optional**. With `ANTHROPIC_API_KEY` set, the backend (never the browser) sends Claude the backend-computed figures and the sourced program list, asks for a JSON strategy, and drops any program id it did not supply. Claude does **no arithmetic** and may not invent amounts, deadlines or eligibility. Without a key, or if the call fails, the API returns a deterministic **rule-based** report, labelled `generation_mode: "rule_based"` and shown as "Rule-based analysis" in the UI. It is never presented as a live AI response. Claude Code/Copilot helped build the project.

## Try it

Prerequisites: Python 3.11+, Node 20+, npm.

**Terminal 1: backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000 · docs: http://localhost:8000/docs. The SQLite DB (`backend/nestflix.db`) and seed data are created on first start; seeding is idempotent.

**Terminal 2: frontend**

```bash
cd frontend
cp .env.example .env.local       # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm install
npm run dev
```

App: http://localhost:3000

**Tests and checks**

```bash
cd backend && .venv/bin/python -m pytest -q        # 36 tests
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | frontend | Backend URL (default `http://localhost:8000`) |
| `ANTHROPIC_API_KEY` | backend | Optional. Enables Claude strategies. Never commit it |
| `ANTHROPIC_MODEL` | backend | Optional model name (default `claude-sonnet-4-5`; set any model your key supports) |
| `NESTFLIX_CORS_ORIGINS` | backend | Comma-separated allowed origins (default localhost:3000) |
| `NESTFLIX_DATABASE_URL` | backend | Optional SQLAlchemy URL (default local SQLite file) |

`.env` files are git-ignored; only `.env.example` files are committed.

### Deploying (optional)

The frontend is Vercel-compatible (set `NEXT_PUBLIC_API_BASE_URL`). Run the FastAPI app separately (any host that runs `uvicorn app.main:app`) and add the frontend origin to `NESTFLIX_CORS_ORIGINS`. `*.vercel.app` origins are allowed by default. Local is the supported demo path.

## 30-Second Demo Script

> "Affordable housing projects often face a large funding shortfall. NestFlix turns that shortfall into an actionable financing plan. This synthetic Orange County home costs $535,000, leaving a $95,000 gap. Our platform helps explore donor, employer, and grant funding, shows how proposed contributions could close the gap, and calculates how interest-rate changes affect affordability. It also documents assumptions, funding restrictions, and the difference between proposed and secured money."

**Click path (about 2 minutes):**
1. Overview: "Affordable housing funding, simplified." Click **Explore Demo Project**.
2. Builder: $535,000 cost, $440,000 existing, **$95,000 gap**. Click **Find Funding Opportunities** (leads, availability unconfirmed).
3. Donor: enter $25,000, projected scenario gap **$70,000**, click **Save Demo Pledge** (stays *proposed*).
4. Employer: enter $40,000 and save. Back on Builder, add a $30,000 grant in the simulator: scenario gap **$0**, with the "commitments and eligibility still require verification" warning, while the **secured gap is still $95,000**.
5. Buyer: move the rate slider from 7.18% to 9%: price falls ~$45,050 and the gap grows by the same.
6. Builder: **Generate Funding Strategy**, then download the report.
7. Reset between runs with **Clear demo contributions** on the Builder page.

**Recording a demo video:** keep both servers running, use any screen recorder (QuickTime, OBS, Loom, phone), follow the click path above, and keep it to 30 seconds to 2 minutes (MP4/MOV). Say out loud that the data is synthetic. Check the link opens signed out before submitting (see `docs/submission.md`).

## Architecture

```
Next.js (frontend/) ──fetch──▶ FastAPI (backend/app) ──▶ SQLite (SQLModel)
                                   │
                                   ├─ services/finance_service.py   pure gap + rate + affordability math (Decimal)
                                   ├─ services/mortgage_service.py  amortization and its inverse
                                   ├─ services/funding_service.py   rule-based program matcher
                                   ├─ services/ai_service.py        Claude (optional) + rule-based fallback
                                   └─ data/funding_programs.json    sourced leads, seeded idempotently
```

All core calculations happen in Python; the frontend only displays API results. Routes are thin; math lives in testable service functions.

**Folder structure**

```
backend/  app/{main,config,database,models,schemas,seed}.py, routers/, services/, data/, tests/
frontend/ app/{page,builders,donors,buyers,employers,sources}, components/, lib/{api,types,utils}.ts
docs/ lanes/ templates/   event material
```

### API summary (full docs at `/docs`)

`GET /health` · `GET /api/projects`, `GET /api/projects/{id}` · `PATCH /api/projects/{id}/costs`, `POST .../costs/reset` · `POST /api/projects/{id}/scenario` · `GET /api/projects/{id}/report` (Markdown) · `GET|POST /api/projects/{id}/contributions`, `PATCH|DELETE .../{cid}`, `POST .../reset` · `POST /api/finance/calculate` · `POST /api/finance/rate-sensitivity` · `POST /api/finance/affordability` · `POST /api/finance/donation-impact` · `POST /api/finance/consortium` · `GET /api/funding-programs` · `GET /api/buyers/demo-household`, `GET /api/buyers/assistance` · `POST /api/ai/funding-strategy`

Negative amounts, invalid percentages and loan terms return `422`; unknown projects/contributions `404`; illegal status moves `409`.

## Sources and assumptions

| Item | Source or assumption | Date checked |
|---|---|---|
| Project costs, buyer price $285,000, subsidies $100,000, earned revenue $55,000 | ASSUMPTION: `lanes/3-fund-it/data/synthetic-example-deal.json` (made-up deal) | n/a |
| Donor $25,000 / employer $40,000 / grant $30,000 | ASSUMPTION: illustrative scenario | n/a |
| 7.18% default mortgage rate | Freddie Mac 30-year rate on FRED, 2026-11-05: https://fred.stlouisfed.org/series/MORTGAGE30US (dated reference, not a live quote) | 2026-11-06 (per event DATA-SOURCES.md) |
| Rate-sensitivity baseline down payment 5% | ASSUMPTION | n/a |
| Housing ratio 30%, total debt ratio 43% | ASSUMPTION (configurable planning values, not underwriting rules) | n/a |
| Demo household income, debt, taxes, insurance | ASSUMPTION: fictional, tuned so the estimate is near $285,000 at 7.18% | n/a |
| Funding programs (CalHome, HOSN, HOME, CDBG, SHOP, AHP, WISH, CalHFA, OC Housing Finance Trust, Santa Ana, Garden Grove, LIIF, ...) | Copied from `lanes/3-fund-it/data/DATA-SOURCES.md`; each record carries its URL and status | 2026-11-06 (not re-fetched by us) |
| Income limits | Not modelled. HCD 2026 State Income Limits were revised June 23, 2026 (replacing May 29) and differ from State HOME limits: https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/income-limits-2026.pdf | 2026-11-06 |
| Employer-assisted housing | No verified source found in the challenge data: shown as an UNVERIFIED lead | 2026-11-06 |

Every number we made up is labelled ASSUMPTION here and in the tool. **No award amounts, deadlines or "open" claims are shown** unless the source file stated them (for example CalHFA pages state percentages and a $150,000 cap, shown as page claims with availability unconfirmed).

## What is real and what is mocked

| Part | Status |
|---|---|
| Gap, secured gap, scenario gap, surplus, rate sensitivity, affordability math | Working, unit-tested |
| API, SQLite persistence, idempotent seed, contribution workflow | Working |
| Funding matcher (type + geography rules, unknowns kept unknown) | Working, rule-based |
| Claude strategy | Working only with a key (not exercised without one); rule-based fallback tested |
| Program records | Sourced leads, not re-verified, availability unknown |
| Project, household, donors, employers, pledges | **Mocked / synthetic** |
| Income-limit tables, live rates, city-specific rules | Not implemented |
| Sending, filing, payments, authentication | Intentionally absent |

## Where it gets things wrong

- The matcher only compares project type and geography; income limits, AMI bands and program-specific rules are **unknown**, so statuses are "Possibly eligible" / "More information required" at best, never approval.
- The project city is unknown, so city programs (Santa Ana, Garden Grove) stay "More information required".
- Rate sensitivity is an illustrative model: it holds payment capacity, down-payment % and non-mortgage costs fixed.
- Donation "impact breakdown" is a proportional, proposed allocation, not a record of spending.
- The Claude path has not been exercised in this repo without a key; any failure falls back to rule-based output.

## Next steps

For a nonprofit or city to use it next month: load a real project (publicly listed, 4-12 homes), add dated HCD/HUD income-limit tables with stale-date warnings, confirm each program's current availability and terms with the provider, add multi-project support and a real pro forma, and have housing-finance staff review the stack logic. One more week: program-stacking rules (what can legally combine), a rate series pulled from the Freddie Mac CSV, and quote/milestone tracking.

## Known limitations

Single synthetic project in the UI; no authentication (demo role switcher only); no document uploads; P2 features (quote comparison, milestones, advanced eligibility) not built.

## Data and privacy

This project uses only public or provided data. It contains no personal information about real tenants, buyers or residents. It does not file applications or contact any city or person. API keys are read from environment variables and never sent to the browser.

## License

MIT, see [`LICENSE`](LICENSE).
