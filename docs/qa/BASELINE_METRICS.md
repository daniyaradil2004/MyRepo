# Baseline Metrics (Initial)

## High-Risk Module Count

- Risk model threshold for high risk: score >= 12
- Identified high-risk modules: **5**
  - Auth
  - Orders
  - Cart
  - Product/Search
  - Recommendation

## Initial Coverage Plan

- P1/P2 automation target (first milestone): **>= 70% of high-risk modules**
- Global code coverage target (near-term): **>= 30% lines/functions**, then raise incrementally.
- Critical-path E2E target:
  - Login flow
  - Browse/search flow
  - Cart operations
  - Order placement

## Estimated Testing Effort

- Initial setup and stabilization: **2-3 person-days**
- P1/P2 automated suite bootstrap: **5-7 person-days**
- Manual exploratory baseline (high-risk flows): **2 person-days**
- Total baseline effort estimate: **9-12 person-days**

## Notes for Research Tracking

- Record each CI run (pass/fail, duration, flaky tests).
- Track risk coverage at module level every sprint.
- Compare defect leakage before and after high-risk automation rollout.
