# QA Deliverables (Risk Assessment, Strategy, Setup, Baseline Metrics)

Last updated: 2026-03-22

## 1) Risk Assessment & Strategy Planning

### 1.1 System Analysis
- Backend (`restaurant-app`): Go API (Gorilla Mux), MongoDB, Neo4j, JWT auth.
- Frontend (`restaurant-front`): Next.js 16 (TypeScript), React 19, Tailwind, Radix UI, Redux slices (auth, products, cart, favorites).
- Integration: Frontend communicates with backend via REST, JWT used on protected endpoints. Recommendation engine depends on MongoDB + Neo4j.

### 1.2 Critical Components (highest potential impact if they fail)
- Authentication and Authorization
  - Files: `restaurant-app/handlers/auth.go`, `restaurant-app/middleware/auth.go`, `restaurant-front/contexts/AuthContext.tsx`
  - Impact: Security exposure, inability to access protected flows.
- Order Creation and Retrieval
  - Files: `restaurant-app/handlers/order.go`, `restaurant-front/app/orders/[id]/page.tsx`, `restaurant-front/app/cart/page.tsx`
  - Impact: Direct revenue loss; broken checkout.
- Cart Management
  - Files: `restaurant-app/handlers/cart.go`, `restaurant-front/lib/api/cart.ts`, `restaurant-front/store/slices/cartSlice.ts`
  - Impact: Conversion drop; broken add/update/remove item flows.
- Product Catalog & Search
  - Files: `restaurant-app/handlers/product.go`, `restaurant-front/app/home/page.tsx`, `restaurant-front/app/search/page.tsx`
  - Impact: Discoverability issues; degraded UX.
- Recommendation Engine
  - Files: `restaurant-app/handlers/recommendation.go`, `restaurant-front/lib/recommendation-engine.ts`
  - Impact: Business value degradation; dual DB dependency (resilience risk).

### 1.3 Risk Prioritization (Probability x Impact)
- Scoring: Probability 1-5, Impact 1-5, Score = P x I.
- Prioritized modules:
  - P1 (Score 16-25)
    - Auth (P=4, I=5) → 20
    - Orders (P=4, I=5) → 20
    - Cart (P=4, I=4) → 16
  - P2 (Score 9-15)
    - Product/Search (P=3, I=4) → 12
    - Recommendations (P=3, I=4) → 12
  - P3/P4
    - Profile (P=3, I=3) → 9
    - Favorites (P=3, I=2) → 6
    - Comments/Reviews (P=2, I=2) → 4

High-risk modules (P1 + P2): 5

### 1.4 Assumptions and Reasoning
- JWT is the only access-control mechanism for protected endpoints.
- MongoDB + Neo4j are both required for full recommendation features; failures cascade to recommendations.
- Primary user journey is web (no mobile scope included here).
- No external payment gateway is in scope; order placement is the transaction boundary.
- Existing unit tests are partial; strategy focuses on high-risk areas first for maximum risk reduction.

---

## 2) QA Environment Setup (Tools and Pipeline)

### 2.1 Local Tooling
- Frontend unit tests: Jest + React Testing Library.
- E2E tests: Playwright (Chromium).
- API contract/regression: Postman/Newman (collection provided).
- Performance baseline: JMeter (test plan provided).

Setup (in `restaurant-front`):
```bash
npm install
npx playwright install
```
Key commands:
- `npm run test` / `npm run test:coverage`
- `npm run test:e2e`

Artifacts added:
- Playwright config: `restaurant-front/playwright.config.ts`
- E2E smoke tests: `restaurant-front/e2e/smoke.spec.ts`
- Postman collection: `docs/qa/postman/restaurant-api.collection.json`
- JMeter plan: `docs/qa/jmeter/restaurant-baseline-test-plan.jmx`

### 2.2 CI Pipeline (GitHub Actions)
Workflow: `.github/workflows/qa-ci.yml`
- frontend-tests:
  - Node 20 setup
  - `npm ci --legacy-peer-deps` (temporary to accommodate React 19 + vaul peer constraint)
  - Unit tests with coverage: `npm run test:coverage`
  - Playwright browser install: `npx playwright install --with-deps chromium`
  - E2E smoke tests: `npm run test:e2e`
    - Playwright launches `npm run dev` via `webServer` to avoid current production build blockers.
- backend-tests:
  - Go setup
  - Build: `go build ./...`
  - Test: `go test ./...` (no or minimal tests yet; passes)

Notes:
- Lint currently excluded from blocking CI due to pre-existing violations; will be re-enabled once debt is addressed.
- E2E runs against dev server in CI to bypass Next.js production prerender constraint on `/profile`.

---

## 3) Initial Test Strategy

### 3.1 Scope and Objectives
- In scope: Frontend (Next.js) + Backend API (Go) and integration via REST.
- Objectives:
  - Protect core revenue path: login → browse → cart → order.
  - Prioritize testing for high-impact/high-probability modules.
  - Automate critical-path checks in CI for fast feedback.
  - Produce baseline metrics for the research paper (risk coverage, code coverage).

### 3.2 Risk Assessment Results
- High risk: Auth, Orders, Cart (P1), Product/Search, Recommendations (P2).
- Medium/Low: Profile, Favorites, Comments/Reviews.

### 3.3 Test Approach
- Automated-first for P1/P2:
  - Frontend unit/component tests for slices, utils, components.
  - E2E smoke tests for authenticated flows (post-login navigation, cart operations, order creation happy-path).
  - API contract checks with Newman in a later phase (collection prepared).
- Manual exploratory:
  - UX, accessibility, responsiveness.
  - Recommendation quality/relevance and edge cases.
  - Rare error-paths not yet automated.
- Sequencing:
  1) Auth/session; 2) Cart + Order; 3) Product/Search + Recommendations; 4) Profile/Favorites/Comments.

### 3.4 Tool Selection and Configuration
- Jest + React Testing Library (unit/component); config in `jest.config.js`.
- Playwright (E2E); config in `playwright.config.ts` with dev server in CI.
- Postman/Newman (API); collection in `docs/qa/postman/...`.
- JMeter (performance baseline); plan in `docs/qa/jmeter/...`.
- GitHub Actions (`.github/workflows/qa-ci.yml`) integrates the above.

### 3.5 Planned Metrics
- Code coverage: functions/lines/branches from Jest (initial 20% threshold present; raise over time).
- Risk coverage: % of P1/P2 modules with automated checks.
- Execution reliability: CI pass/fail trends, flakiness.
- Performance: response-time percentiles for selected endpoints (nightly JMeter later).

---

## 4) Baseline Metrics (for Research Paper)

### 4.1 High-Risk Module Count
- Count (P1 + P2): 5 modules.

### 4.2 Initial Coverage Plan
- Automate ≥70% of P1/P2 modules in first iteration.
- Raise global coverage gradually (start at ~20–30% then increase).
- Critical-path E2E must cover:
  - Login
  - Browse/Search
  - Cart operations
  - Order placement

### 4.3 Estimated Testing Effort
- Setup & stabilization: 2–3 person-days.
- P1/P2 automation bootstrap: 5–7 person-days.
- Manual exploratory baseline (high-risk flows): 2 person-days.
- Total baseline: 9–12 person-days.

---

## References
- High-level overview: `README.md`
- Frontend architecture: `restaurant-front/docs/ARCHITECTURE.md`
- Additional QA docs:
  - `docs/qa/INITIAL_TEST_STRATEGY.md`
  - `docs/qa/QA_ENVIRONMENT_SETUP.md`
  - `docs/qa/BASELINE_METRICS.md`
  - This file: `docs/qa/QA_DELIVERABLES.md`
