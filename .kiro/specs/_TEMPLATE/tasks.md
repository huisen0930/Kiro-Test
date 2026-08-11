# Tasks — <Feature Name>

> The build order. Each task is a small, pickable slice that becomes one GitHub issue.
> Reference the requirement IDs each task satisfies so traceability holds end to end.
> Status markers: `[ ]` not started, `[-]` in progress, `[x]` done, `[~]` stretch/deferred.

- [ ] 1. <First slice — usually domain logic + its unit tests>
  - <What to build.>
  - _Requirements: 1.1, 1.2._

- [ ] 2. <Repository / persistence for this feature>
  - <Interface + in-memory impl.>
  - _Requirements: 2.1._

- [ ] 3. <Zod schemas>
  - <Request/response shapes.>
  - _Requirements: 1.3._

- [ ] 4. <Routes + wiring + integration tests>
  - <Endpoints, validation, error envelope, tests via app.inject().>
  - _Requirements: 1.1-1.3, 2.1._

---
### Progress
<Short running note on what's done and what's next.>
