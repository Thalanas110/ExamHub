# ExamHub Frontend Strict FSD Migration Design

**Date:** 2026-09-24

## Task classification

Refactor: preserve behavior and rendered UI while changing frontend ownership boundaries and folder structure.

## Goal

Move the ExamHub frontend from its current `src/app`-centered organization to a strict Feature-Sliced Design structure modeled on `school/meatlens/botchabuster/frontend`.

The migration must preserve the application exactly from a user's perspective:

- all route paths and route parameters
- all rendered text, DOM structure, classes, icons, assets, and visual states
- all keyboard, pointer, modal, form, navigation, loading, and error flows
- the existing `useApp()` context contract and backend API behavior
- anti-cheat, exam timing, submission, grading, and violation behavior

This is an ownership and dependency refactor, not a redesign or product change.

## Scope and non-goals

### In scope

- strict top-level FSD layers under `frontend/src`
- moving existing modules without changing their observable behavior
- decomposing services, context domains, pages, and feature modules where needed
- moving TanStack Router route files and generated route output into the app layer
- adding architecture checks modeled on the reference project
- documenting the resulting architecture and verification commands
- at least 40 coherent implementation commits, in addition to this design commit

### Out of scope

- visual redesign, styling cleanup, copy changes, or UX improvements
- route renaming or backend endpoint changes
- replacing the context state model with Zustand, Redux, React Query, or another store
- changing React, Vite, TanStack Router, or UI-library versions unless required to keep the existing build working
- rewriting unrelated backend or working-tree changes
- weakening, skipping, or deleting existing E2E coverage

## Current baseline

The frontend currently builds with `npm run build` and exits successfully. The build reports existing TanStack external-import warnings but completes the client, SSR, and prerender phases.

The current frontend has these principal ownership areas nested under `src/app`:

- application bootstrap and context
- shared UI primitives and shared components
- route pages
- feature modules
- API services and HTTP helpers
- domain data types

The repository is intentionally dirty before this task. Existing user changes, including changes outside the frontend, must not be reverted or staged as part of this refactor unless they are explicitly part of a touched file and are preserved in place.

## Target architecture

The target dependency direction is:

`shared <- entities <- features <- widgets <- pages <- app`

An upper layer may depend on lower layers. A lower layer must not import an upper layer. Slices at the same layer may only use each other through public slice entrypoints, not deep internals.

### `shared`

Owns reusable infrastructure with no ExamHub business ownership:

- generic UI primitives currently under `app/components/ui`
- generic UI helpers and hooks
- HTTP transport, base URL resolution, auth-header attachment, and request errors
- generic utilities, formatting helpers, and browser-safe storage helpers
- global styles, theme styles, and fonts

`shared` must not import from `entities`, `features`, `widgets`, `pages`, or `app`.

### `entities`

Owns stable domain concepts and their public contracts:

- user
- class
- exam
- submission/result
- violation
- report/analytics data
- API documentation data where it is domain-owned

Each entity may expose `model`, `api`, and `ui` subdirectories where justified. Entity public APIs are exposed through shallow slice entrypoints. Entity APIs depend on `shared` transport and types only.

### `features`

Owns user actions and route-local workflows:

- authentication and registration
- student exam taking
- teacher exam editing and publishing
- teacher grading
- teacher violation-case review
- question analytics
- admin API reference and verification
- import/export tools
- exam accommodations

Feature components must preserve the existing JSX and event behavior. Pure logic is extracted first; markup is moved mechanically afterward.

### `widgets`

Owns reusable screen compositions that combine multiple features or entities:

- dashboard layout and role layouts
- admin, teacher, and student dashboard compositions
- shared analytics or table compositions used across pages
- other cross-feature screen sections that are not route entries

Widgets may depend on features, entities, and shared, but not on pages or app internals.

### `pages`

Owns route-facing composition only:

- admin pages
- teacher pages
- student pages
- auth pages
- public landing page

Each page is a thin entry module that performs route-level composition and access/parameter wiring. Existing exported page names are preserved where route imports rely on them.

### `app`

Owns application-wide composition:

- `App.tsx`
- the existing `AppContext` provider and its domain orchestration modules
- TanStack Router setup
- filesystem route modules
- generated route tree
- app-level assets and CSS wiring

The context remains the public state contract. Its implementation may be split into typed storage, selectors, and domain modules, but consumers continue to call `useApp()` with the existing shape.

## Routing strategy

TanStack Router remains in use. Its route directory and generated route tree will be configured under the app layer, for example:

```text
frontend/src/app/router/routes/**
frontend/src/app/router/routeTree.gen.ts
```

The route paths, route IDs, loaders/guards, lazy behavior, root document behavior, and `ssr: false` behavior remain unchanged. Generated route output is treated as build output from the checked-in route sources and is validated by the build.

## Migration strategy

The work proceeds incrementally in dependency order:

1. establish FSD configuration, aliases, boundary-test scaffolding, and documentation
2. move shared infrastructure without changing behavior
3. establish entity slices and move domain data/API ownership
4. split and reassemble the application context
5. move feature slices and extract pure logic before JSX sections
6. move widgets and thin page entries
7. move TanStack route files and generated route output
8. remove legacy `src/app` ownership roots and enforce boundaries
9. run full build and E2E verification

During every step, imports are updated mechanically and no compatibility alias is allowed to hide a forbidden legacy layer in the final tree. Temporary migration shims, if required for one commit, are removed before the architecture gate is enabled.

## UI/UX preservation rules

For every moved component:

- copy JSX structure exactly before simplifying anything
- keep text, labels, `aria-*` attributes, data attributes, classes, inline styles, and icon components unchanged
- keep event ordering, state transitions, timers, storage keys, and API payloads unchanged
- keep lazy-loading and route-level loading behavior unchanged
- do not rename user-visible concepts merely to match a folder name
- do not combine or split DOM nodes unless the resulting output is mechanically identical

Any needed change that affects rendered output is a blocker and must be reported instead of being folded into the refactor.

## Verification strategy

### Targeted checks

After each slice migration:

- run the relevant TypeScript/Vite build check
- run the smallest related Playwright spec(s)
- inspect the diff for accidental JSX, class, copy, or route changes

### Architecture checks

Add a deterministic Node-based checker modeled on the reference project that verifies:

- only allowed FSD layer roots exist in production source
- no legacy roots such as `components`, `contexts`, `hooks`, `integrations`, `lib`, or `types` exist as top-level production owners
- imports do not move upward in the FSD layer graph
- cross-slice deep imports are rejected
- no legacy `src/app/pages`, `src/app/features`, `src/app/components`, or `src/app/services` ownership remains

The checker is additive and must not replace build or E2E gates.

### Final checks

Run from `frontend`:

```text
npm run build
npm run test:e2e
npm run test:architecture
```

The full E2E suite remains the behavior gate. Remote GitHub Actions status is reported separately if no workflow or credentials are available.

## Commit plan

The following commits are the minimum planned implementation sequence. Each commit has one coherent concern and should leave the project buildable or clearly document the required next dependency.

1. add the strict FSD migration documentation and invariants
2. add route-generator configuration for app-owned route sources
3. add FSD layer metadata and checker scaffolding
4. add architecture-check unit cases for layer ordering
5. add architecture-check unit cases for legacy roots and deep imports
6. move global styles into the app/shared style ownership boundary
7. move app-owned documentation image assets without changing imports
8. move generic UI utility helpers to shared
9. move shared UI primitives batch one
10. move shared UI primitives batch two
11. move shared UI primitives batch three
12. move shared layout-independent components to widgets/shared ownership
13. move HTTP base URL and request transport to shared API
14. move API error and auth-header behavior to shared API
15. establish the user entity slice and public API
16. establish the class entity slice and public API
17. establish the exam entity slice and public API
18. establish the submission/result entity slice and public API
19. establish violation and report entity contracts
20. establish documentation and analytics entity contracts
21. split authentication service ownership into the auth feature/entity boundary
22. split user and class service ownership by entity
23. split exam and accommodation service ownership by entity/feature
24. split result, report, violation, and documentation service ownership
25. extract AppContext public types and storage helpers
26. extract AppContext selectors and pure derivations
27. extract authentication context domain orchestration
28. extract user and class context domain orchestration
29. extract exam and submission context domain orchestration
30. reassemble AppProvider with the unchanged `useApp()` contract
31. move auth page composition into the pages/features layers
32. move dashboard layouts into widgets and preserve role shells
33. move admin dashboard compositions into widgets
34. move student dashboard compositions into widgets
35. move teacher dashboard compositions into widgets
36. move student take-exam feature logic and presentation
37. move teacher exams feature logic and presentation
38. move teacher grade feature logic and presentation
39. move teacher violation-case feature logic and presentation
40. move analytics feature logic and presentation
41. move admin API reference feature logic and presentation
42. move import/export and accommodations feature logic
43. move remaining admin, teacher, student, and public page entries
44. move TanStack route source files into `app/router/routes`
45. move and regenerate the TanStack route tree under `app/router`
46. remove old `src/app` feature/page/component/service ownership roots
47. enforce FSD architecture through the frontend package scripts
48. update frontend architecture and test documentation
49. run targeted E2E regressions and fix only structural regressions
50. run the complete build, architecture, and E2E gates

The exact number may increase when a slice needs a separate safe intermediate commit, but it will not be reduced below 40 implementation commits.

## Risks and mitigations

### Generated route tree drift

Mitigation: configure TanStack's route directory and generated output before moving route files; run the build immediately after each routing change.

### Accidental UI changes during extraction

Mitigation: mechanical JSX moves, targeted Playwright checks after each feature, and diff review focused on markup, text, classes, and event handlers.

### Circular dependencies during entity/service moves

Mitigation: establish the dependency graph first, keep shared transport free of domain imports, and use entity public entrypoints rather than cross-slice deep imports.

### Existing dirty-worktree changes

Mitigation: never reset or checkout user files; stage explicit task files only; inspect `git diff --name-status` before every commit.

### Long-running verification

Mitigation: use targeted specs during migration and reserve the complete E2E lane for final gates, without skipping tests or weakening assertions.

## Acceptance criteria

The task is complete only when:

1. production source is organized under the strict FSD layers
2. the architecture checker passes with no upward or legacy-owner violations
3. the existing build passes
4. the full Playwright suite passes
5. route paths and user-visible behavior remain unchanged
6. no unrelated dirty-worktree change has been reverted or included
7. at least 40 coherent implementation commits exist for this refactor
