# ExamHub Backend Modular Monolith Design

## Goal

Refactor the ExamHub PHP backend from a globally layered structure into a modular monolith while keeping all observable backend behavior unchanged.

## Scope and invariants

- Preserve every existing endpoint path, HTTP method, status code, public error message, response field name, authorization rule, encryption rule, and database routine call.
- Preserve the `api/index.php` deployment entrypoint and the Docker/Render deployment shape.
- Do not change database schemas, migration order, stored routines, SQL behavior, or seed data semantics.
- Do not add compatibility facades for the legacy `App\Controllers`, `App\Services`, `App\Routing\Routes`, or `App\Logging` namespaces.
- Update all production imports, scripts, tests, documentation references, and bootstrap wiring to the final module namespaces.
- Do not add runtime dependencies.
- Existing user changes and unrelated files remain untouched.

## Target architecture

The backend will retain one deployable PHP application and one process, but its code will be organized around explicit bounded contexts.

```text
api/index.php
backend/src/
  Application/
  Shared/
    Config/
    Database/
    Http/
    Observability/
    Security/
    Support/
  Bootstrap/
  Modules/
    Admin/
    Auth/
    Classes/
    Data/
    Docs/
    Exams/
    Health/
    Reports/
    Results/
    Users/
    Violations/
```

Each business module owns the layers it needs:

```text
Modules/<Module>/
  Domain/
  Application/
  Infrastructure/
  Presentation/
```

The final namespace and directory casing will follow the repository's existing PSR-4 `App\\` autoload mapping and PHP naming conventions. Modules expose registration/composition entrypoints; their internal infrastructure is not imported by other modules.

### Shared platform

Shared code is restricted to cross-cutting concerns: environment/configuration, HTTP request and response transport, routing primitives, PDO connections and routine access, API exceptions, cryptography, JWT/password primitives, and logging infrastructure. Shared code must not contain exam, user, class, result, or report business rules.

### Modules

- `Auth`: registration, login, logout, token authentication, and profile-facing authentication operations.
- `Users`: profile and administrative user management.
- `Classes`: class creation, membership, joining, enrollment, and removal.
- `Exams`: exam CRUD, payload validation, accommodations, effective exam policy, mapping, and question analytics inputs.
- `Results`: attempt lifecycle, submission, grading, feedback, answer encryption, and result reads.
- `Reports`: exam performance, pass/fail, and question analytics reports.
- `Admin`: administrative report views and administrative log reads.
- `Data`: reseeding, seed bootstrap, and encrypted-storage repair workflows.
- `Violations`: exam violation events and violation cases.
- `Docs`: API documentation verification.
- `Health`: health endpoint.

### Dependency direction

Presentation depends on application contracts. Application depends on domain types and ports. Infrastructure implements ports and may use shared database/security infrastructure. Modules may depend on shared contracts but may not import another module's infrastructure or private implementation. All concrete cross-module wiring occurs in the composition root.

## Request and error flow

1. `api/index.php` loads environment/configuration and creates the backend application.
2. The composition root creates shared infrastructure once and wires module dependencies.
3. Module registration adds the existing route patterns, authentication flags, and role lists to the router.
4. The router resolves the bearer token and dispatches to the module presentation controller.
5. Controllers parse transport input and invoke the application operation that owns the behavior.
6. Application operations use module ports and existing mappers/validators to produce the existing response arrays.
7. The entrypoint writes request/audit events and serializes the response using the existing transport-encryption policy.

`ApiException` status codes and messages remain unchanged. Router-level 401, 403, and 404 responses remain unchanged. Unexpected exceptions remain generic 500 responses. Optional logging remains fail-open where it is fail-open today. The refactor does not introduce retries, caching, new validation, or authorization changes.

## Testing and quality gates

Before migration, characterize route registration, response metadata, and endpoint contracts. During migration, use test-first changes for new module contracts and run the smallest affected standalone PHP test lane after each commit. Cutover commits run the complete backend aggregate test command. Architecture tests enforce:

- no imports from the removed legacy namespaces;
- module dependency direction;
- module public-surface registration;
- complete route registration;
- one composition root;
- no module presentation/application code reaching directly into infrastructure from another module.

The repository has no GitHub Actions workflow. The local completion gate is the documented Composer/standalone PHP suite plus any available frontend build or deployment configuration validation affected by the change. Database integration tests that require credentials are reported separately when unavailable; they are not silently skipped.

## Commit plan

The refactor is split into exactly 50 implementation commits. Every commit is coherent, independently reviewable, and leaves the testable application in a valid state.

1. Record the backend baseline and endpoint inventory.
2. Add a backend aggregate test command without changing existing test lanes.
3. Add characterization tests for router response metadata and status behavior.
4. Add the architecture-boundary test harness.
5. Add shared API error contracts.
6. Move configuration and environment parsing into `Shared/Config`.
7. Move HTTP request/response and transport-envelope code into `Shared/Http`.
8. Move database connections, PDO factory, and routine gateway into `Shared/Database`.
9. Move crypto, JWT, and password primitives into `Shared/Security`.
10. Move logging ports/adapters and retention infrastructure into `Shared/Observability`.
11. Create the application bootstrap contract and empty module registry.
12. Migrate auth domain contracts and authentication context.
13. Migrate auth application operations.
14. Migrate auth infrastructure adapters.
15. Migrate auth controllers/routes and remove the old auth classes.
16. Migrate the users domain contracts and profile mapping.
17. Migrate users application operations.
18. Migrate users infrastructure adapters.
19. Migrate users controllers/routes and remove the old user classes.
20. Migrate the classes application/domain layer.
21. Migrate classes infrastructure.
22. Migrate classes controllers/routes and remove the old class classes.
23. Migrate exam validation, mapping, and domain contracts.
24. Migrate exam CRUD application operations.
25. Migrate accommodations and exam-policy operations.
26. Migrate exam infrastructure adapters.
27. Migrate exam controllers/routes and remove the old exam classes.
28. Migrate result domain contracts and answer/payload validation.
29. Migrate attempt start/submit application operations.
30. Migrate grading, feedback, and analytics application operations.
31. Migrate result infrastructure adapters.
32. Migrate result controllers/routes and remove the old result classes.
33. Migrate reports and question-analytics operations.
34. Migrate admin report and admin-log operations.
35. Migrate violation domain and case application operations.
36. Migrate violation/log infrastructure adapters.
37. Migrate violation controllers/routes and remove old violation/log classes.
38. Migrate data reseeding, seed, and encryption-repair operations.
39. Migrate data controllers/routes and scripts.
40. Migrate docs and health modules.
41. Replace the legacy route registry with module registration.
42. Replace the global service container with module factories.
43. Update `api/index.php` to use the new application bootstrap.
44. Update all PHP tests to final module namespaces.
45. Update all scripts, Docker references, and deployment references.
46. Remove obsolete flat source directories and verify no imports remain.
47. Add module public-surface and dependency-direction tests.
48. Add route-contract and behavior-parity tests for every endpoint group.
49. Update backend architecture documentation and developer setup instructions.
50. Run the complete local gate, fix only test-proven regressions, and commit the final verified state.

The design-document commit is a planning artifact and is separate from the 50 implementation commits above.

## Completion criteria

The work is complete when the final backend has no legacy namespace facades or imports, all listed modules are wired through one composition root, all routes and public contracts are preserved, all applicable local gates pass with fresh output, and the final diff contains no database behavior changes.
