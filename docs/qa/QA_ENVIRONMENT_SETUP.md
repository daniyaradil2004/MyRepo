# QA Environment Setup

## Prerequisites

- Node.js 20+
- Go 1.25+
- MongoDB and Neo4j running locally or via cloud instances
- GitHub repository connected for CI execution

## 1) Local Tooling Setup

### Frontend test dependencies
Run in `restaurant-front`:

```bash
npm install
npx playwright install
```

Available commands:
- `npm run test` (unit/component tests)
- `npm run test:coverage` (coverage)
- `npm run test:e2e` (Playwright E2E)

### API testing toolchain (Postman/Newman)
- Import `docs/qa/postman/restaurant-api.collection.json` into Postman.
- For CLI execution in CI/local:

```bash
npx newman run docs/qa/postman/restaurant-api.collection.json
```

### Performance baseline toolchain (JMeter)
- Open `docs/qa/jmeter/restaurant-baseline-test-plan.jmx` in Apache JMeter.
- Configure base URL and concurrency for target environment.

## 2) Version Control and Test Repository Structure

Recommended tracked paths:
- `docs/qa/` for strategy, metrics, and test assets
- `restaurant-front/e2e/` for UI test scenarios
- `.github/workflows/` for CI definitions

Branch policy suggestion:
- Feature branches for test assets and automation updates
- Pull request checks must pass `qa-ci` workflow

## 3) CI/CD Test Pipeline

The workflow in `.github/workflows/qa-ci.yml` performs:
1. Frontend install and lint
2. Frontend Jest test + coverage
3. Playwright browser install and E2E execution
4. Backend Go build and test

Optional extensions:
- Add Newman job with environment variables for staging.
- Add JMeter non-GUI run for nightly performance baselines.
