# Initial Test Strategy - Restaurant Food Ordering Platform

## 1) Project Scope and Objectives

### System in scope
- Backend API: `restaurant-app` (Go, Gorilla Mux, MongoDB, Neo4j)
- Frontend web app: `restaurant-front` (Next.js, TypeScript, Redux Toolkit)
- Integration layer: frontend-to-backend API communication and JWT auth flow

### Quality objectives
- Protect core business flow: login -> browse -> cart -> checkout/order.
- Reduce production risk for security-sensitive and transaction-sensitive modules.
- Establish repeatable automated checks in CI for fast feedback.
- Provide traceable baseline metrics for the research paper.

## 2) Risk Assessment Results (Probability x Impact)

Risk scoring model:
- Probability: 1 (low) to 5 (high)
- Impact: 1 (low) to 5 (high)
- Risk score = Probability x Impact

| Module | Probability | Impact | Score | Priority | Why this matters |
|---|---:|---:|---:|---|---|
| Auth (`handlers/auth.go`, `middleware/auth.go`, `contexts/AuthContext.tsx`) | 4 | 5 | 20 | P1 | Failure blocks all protected functionality and creates security exposure. |
| Order flow (`handlers/order.go`, `app/orders`, `app/cart`) | 4 | 5 | 20 | P1 | Revenue-critical; regression can cause failed/incorrect purchases. |
| Cart management (`handlers/cart.go`, `store/slices/cartSlice.ts`) | 4 | 4 | 16 | P1 | High user traffic area with direct conversion impact. |
| Product/catalog & search (`handlers/product.go`, `app/home`, `app/search`) | 3 | 4 | 12 | P2 | Core discovery journey; errors reduce usability and conversion. |
| Recommendation engine (`handlers/recommendation.go`, `lib/recommendation-engine.ts`) | 3 | 4 | 12 | P2 | Business value feature with dual DB dependencies (MongoDB + Neo4j). |
| User profile (`handlers/user.go`, `app/profile`) | 3 | 3 | 9 | P3 | Important for account maintenance, lower immediate revenue impact. |
| Favorites (`handlers/favorite.go`, `app/favorites`) | 3 | 2 | 6 | P4 | Convenience feature; failure is visible but non-blocking. |
| Comments/reviews (`handlers/comment.go`) | 2 | 2 | 4 | P4 | Low transaction impact; moderate reputation impact. |

High-risk modules (P1 + P2): **5**

## 3) Test Approach

### Manual vs automated
- **Automated first** for P1/P2 modules:
  - Unit tests (reducers, utility logic, validation)
  - API integration tests (Postman/Newman collection in CI)
  - E2E smoke + critical journeys (Playwright)
- **Manual exploratory testing** for:
  - UX layout and responsive behavior
  - recommendation relevance/quality checks
  - edge-case validation not yet automated

### Risk-first sequencing
1. Auth and session persistence
2. Cart and order creation
3. Product retrieval/search and recommendation endpoints
4. Profile/favorites/comments regression

## 4) Tool Selection and Configuration

- **Jest + React Testing Library**: frontend unit/component tests.
- **Playwright**: browser-level E2E smoke and critical-path scenarios.
- **Postman + Newman**: API contract and regression pack in CI.
- **Selenium (configured as optional backup)**: cross-browser UI runner if Playwright needs comparative verification.
- **JMeter**: baseline load profile for `/api/products`, `/api/cart`, and `/api/orders`.

Configured artifacts in repository:
- Frontend test scripts and dependencies in `restaurant-front/package.json`.
- Playwright config in `restaurant-front/playwright.config.ts`.
- Initial E2E smoke tests in `restaurant-front/e2e/smoke.spec.ts`.
- CI workflow in `.github/workflows/qa-ci.yml`.
- Postman collection placeholder in `docs/qa/postman/restaurant-api.collection.json`.
- JMeter test plan placeholder in `docs/qa/jmeter/restaurant-baseline-test-plan.jmx`.

## 5) Planned Metrics

- **Coverage metrics**: line/function/branch coverage from Jest.
- **Risk coverage**: % of P1/P2 modules covered by automated tests.
- **Execution reliability**: pass/fail trend per pipeline run.
- **Defect metrics**: escaped defects by module and severity.
- **Performance baseline**: response-time percentiles for selected API endpoints from JMeter.

## 6) Assumptions and Reasoning

- JWT auth remains the single access control mechanism for protected routes.
- MongoDB and Neo4j are both required for full recommendation behavior.
- Current production-critical user journey is web-only (no mobile app scope).
- No payment gateway module is present; order placement is the transaction boundary.
- Existing tests are partial; strategy prioritizes highest-risk flows before broad coverage.
