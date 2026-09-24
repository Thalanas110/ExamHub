# Strict Frontend FSD Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the ExamHub React frontend into strict top-level Feature-Sliced Design layers while preserving every existing route, rendered UI detail, interaction, API contract, and state transition.

**Architecture:** Migrate from the current `src/app`-centered organization to `src/shared`, `src/entities`, `src/features`, `src/widgets`, `src/pages`, and `src/app`. Dependency direction is downward only: shared infrastructure is consumed by entities, entities by features, features by widgets, widgets by pages, and all composition is owned by app. TanStack Router remains the router, with route sources and its generated tree moved under `src/app/router`.

**Tech Stack:** React 18.3.1, Vite 7, TypeScript 5.9, TanStack Router/Start, Playwright, existing context-based application state, existing MUI/Radix/Lucide UI dependencies, and Node-based architecture checks.

## Global Constraints

- Preserve all route paths and route parameters.
- Preserve all rendered text, DOM structure, classes, icons, assets, and visual states.
- Preserve all keyboard, pointer, modal, form, navigation, loading, and error flows.
- Preserve the existing `useApp()` context contract and backend API behavior.
- Do not redesign, restyle, rename user-visible concepts, or change product behavior.
- Do not replace the context state model with Zustand, Redux, React Query, or another store.
- Do not revert or stage unrelated pre-existing working-tree changes.
- Do not use focused tests, skipped tests, weakened assertions, swallowed failures, or disabled quality gates.
- Run the relevant existing Playwright scenario before and after each behavior-bearing migration.
- Keep every task’s commit coherent and independently reviewable.
- Produce at least 40 implementation commits after the design commit `914b7f2`.

## File and ownership map

The following ownership map is the target. A file may be split into smaller files during execution, but it must remain within the listed layer and slice.

| Target area | Responsibility | Initial sources |
| --- | --- | --- |
| `frontend/src/shared/ui` | generic Radix/shadcn-style primitives | `src/app/components/ui/**` |
| `frontend/src/shared/api` | HTTP transport, base URL, request errors, auth headers | `src/app/services/http/**`, transport portions of `services/api.ts` |
| `frontend/src/shared/lib` | generic helpers and browser-safe utilities | `src/app/components/ui/utils.ts`, generic service helpers |
| `frontend/src/shared/styles` | global CSS, theme, Tailwind, fonts | `src/styles/**` |
| `frontend/src/entities/user` | user types, user API, user-owned selectors | `src/app/data/types.ts`, user service portions |
| `frontend/src/entities/class` | class types and class API | class service portions |
| `frontend/src/entities/exam` | exam/question types and exam API | exam service portions |
| `frontend/src/entities/submission` | submission/result types and API | result service portions |
| `frontend/src/entities/violation` | violation types and API | violation service portions |
| `frontend/src/entities/report` | report/analytics contracts and API | report service portions |
| `frontend/src/entities/api-docs` | endpoint documentation contracts and API | docs service and endpoint-doc portions |
| `frontend/src/features/auth` | login and registration flows | `src/app/pages/auth/**`, auth context actions |
| `frontend/src/features/student/take-exam` | exam attempt orchestration and UI sections | `src/app/features/student/take-exam/**`, `src/app/pages/student/TakeExam.tsx` |
| `frontend/src/features/teacher/exams` | teacher exam editing and violation modal flow | teacher exams sources |
| `frontend/src/features/teacher/grade` | grading and submission violation flow | teacher grade sources |
| `frontend/src/features/teacher/violation-cases` | violation-case review flow | teacher violation-case sources |
| `frontend/src/features/analytics/question-analytics` | question analytics filters, formatters, and UI | analytics sources |
| `frontend/src/features/admin/api-reference` | endpoint reference and verification UI | admin API reference sources |
| `frontend/src/features/import-export` | import/export actions and helpers | import-export sources |
| `frontend/src/features/exam-accommodations` | accommodation modal and API action | accommodation sources |
| `frontend/src/widgets/layouts` | dashboard and role layout composition | shared/dashboard layout sources |
| `frontend/src/widgets/admin-dashboard` | admin dashboard composition | `pages/admin/AdminDashboard.tsx` |
| `frontend/src/widgets/student-dashboard` | student dashboard composition | `pages/student/StudentDashboard.tsx` |
| `frontend/src/widgets/teacher-dashboard` | teacher dashboard composition | `pages/teacher/TeacherDashboard.tsx` |
| `frontend/src/pages/**` | thin route-facing page entries | all `src/app/pages/**` |
| `frontend/src/app/providers` | `AppProvider`, global toaster, bootstrap composition | `src/app/App.tsx`, `src/app/context/**` |
| `frontend/src/app/router/routes/**` | TanStack file routes | `src/routes/**` |
| `frontend/src/app/router/routeTree.gen.ts` | generated TanStack route tree | `src/routeTree.gen.ts` |

## Execution rules

Before starting implementation, create the isolated worktree using `superpowers:using-git-worktrees` unless the existing dirty worktree makes that unsafe; if isolation cannot preserve the user’s in-progress changes, keep the current worktree and use explicit path staging. Do not run a destructive cleanup command.

For every task that moves production code:

1. inspect the current file and its imports;
2. run the relevant baseline Playwright spec or build check;
3. make only the structural change;
4. run the targeted check again;
5. inspect `git diff --check` and `git diff --name-status`;
6. stage only paths listed by that task;
7. commit using the exact commit message shown.

The test commands below run from `frontend` unless otherwise noted. A targeted Playwright command is expected to start the configured Vite server and report the named spec as passing. If a test fails, follow `superpowers:systematic-debugging` before changing code.

---

### Task 1: Configure app-owned TanStack route generation

**Files:**
- Create: `frontend/tsr.config.json`
- Modify: `frontend/vite.config.ts`

**Interfaces:**
- Produces the route source root `src/app/router/routes` and generated output `src/app/router/routeTree.gen.ts` for later routing tasks.

- [ ] **Step 1: Add the generator configuration**

```json
{
  "routesDirectory": "./src/app/router/routes",
  "generatedRouteTree": "./src/app/router/routeTree.gen.ts"
}
```

- [ ] **Step 2: Point the router entry at the future generated tree**

Change `frontend/src/router.tsx` only after Task 45 moves the file; for this task, keep the current import working and verify the generator accepts the config.

- [ ] **Step 3: Run the build**

Run: `npm run build`

Expected: exit code 0 and the existing client, SSR, and prerender phases complete.

- [ ] **Step 4: Commit**

```text
git add frontend/tsr.config.json frontend/vite.config.ts
git commit -m "chore: configure app-owned tanstack routes"
```

### Task 2: Add FSD boundary checker tests first

**Files:**
- Create: `frontend/scripts/check-fsd-boundaries.test.mjs`
- Create: `frontend/scripts/check-source-size.test.mjs`

**Interfaces:**
- Tests import `findViolations`, `findLegacyRootImportOwners`, `findProductionOwnerViolations`, and `findSourceSizeViolations` from the checker modules created in Task 3.

- [ ] **Step 1: Write failing architecture tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  findViolations,
  findLegacyRootImportOwners,
  findProductionOwnerViolations,
} from "./check-fsd-boundaries.mjs";
import { findSourceSizeViolations } from "./check-source-size.mjs";

const rootDir = new URL("../src/", import.meta.url);

test("production source has no upward FSD imports", async () => {
  assert.deepEqual(await findViolations(rootDir.pathname), []);
});

test("production source has no legacy-root imports", async () => {
  assert.deepEqual(await findLegacyRootImportOwners(rootDir.pathname), []);
});

test("production source has no non-FSD owners", async () => {
  assert.deepEqual(await findProductionOwnerViolations(rootDir.pathname), []);
});

test("source-size report is available without enforcing a limit", async () => {
  const result = await findSourceSizeViolations(rootDir.pathname);
  assert.ok(Array.isArray(result));
});
```

- [ ] **Step 2: Run the tests and verify the expected red state**

Run: `node --test scripts/check-fsd-boundaries.test.mjs scripts/check-source-size.test.mjs`

Expected: FAIL because the checker modules do not exist yet and the current `src/app` structure is not strict FSD.

- [ ] **Step 3: Commit the failing tests**

```text
git add frontend/scripts/check-fsd-boundaries.test.mjs frontend/scripts/check-source-size.test.mjs
git commit -m "test: define frontend fsd boundary checks"
```

### Task 3: Implement reusable FSD boundary and source-size checks

**Files:**
- Create: `frontend/scripts/check-fsd-boundaries.mjs`
- Create: `frontend/scripts/check-source-size.mjs`

**Interfaces:**
- `findViolations(rootDir): Promise<Array<{file:string, importPath:string, rule:string}>>`
- `findLegacyRootImportOwners(rootDir): Promise<Array<{file:string, importPath:string, owner:string}>>`
- `findProductionOwnerViolations(rootDir): Promise<Array<{file:string, rule:string}>>`
- `findSourceSizeViolations(rootDir, options?): Promise<Array<{file:string, nonBlankLines:number, rule:string}>>`

- [ ] **Step 1: Implement the checker using the reference algorithm**

Use the same layer order and import parsing behavior as `school/meatlens/botchabuster/frontend/scripts/check-fsd-boundaries.mjs`, with these ExamHub legacy roots: `components`, `context`, `features`, `pages`, `services`, `data`, `routes`, and `styles` when they exist outside an allowed app-owned path. The final allowed source roots are `shared`, `entities`, `features`, `widgets`, `pages`, `app`, plus `main.tsx` and `vite-env.d.ts`.

- [ ] **Step 2: Implement source-size reporting**

Use `splitTrigger: 450` and `hardLimit: 600`, matching the reference project. Reporting must never alter or skip source files.

- [ ] **Step 3: Run the tests and confirm they now fail only on current architecture violations**

Run: `node --test scripts/check-fsd-boundaries.test.mjs scripts/check-source-size.test.mjs`

Expected: the checker modules load and the assertions identify current structural violations rather than missing-module errors.

- [ ] **Step 4: Commit**

```text
git add frontend/scripts/check-fsd-boundaries.mjs frontend/scripts/check-source-size.mjs
git commit -m "chore: add frontend fsd boundary tooling"
```

### Task 4: Establish shared style ownership

**Files:**
- Create: `frontend/src/shared/styles/fonts.css`
- Create: `frontend/src/shared/styles/index.css`
- Create: `frontend/src/shared/styles/tailwind.css`
- Create: `frontend/src/shared/styles/theme.css`
- Modify: `frontend/src/routes/__root.tsx`

**Interfaces:**
- The root route continues to import the same CSS bundle and emits the same stylesheet link.

- [ ] **Step 1: Run the root hydration spec before the move**

Run: `npm run test:e2e -- tests/e2e/infrastructure/hydration.spec.ts`

Expected: the existing hydration scenario passes.

- [ ] **Step 2: Move CSS files without changing contents**

Use `git mv` for the four CSS files. Update only relative import paths required by the new owner.

- [ ] **Step 3: Run the build and hydration spec**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/infrastructure/hydration.spec.ts`

Expected: both commands exit 0 and no CSS class or stylesheet reference changes appear in the diff.

- [ ] **Step 4: Commit**

```text
git add frontend/src/shared/styles frontend/src/routes/__root.tsx
git commit -m "refactor: move global styles to shared"
```

### Task 5: Move generic utility helpers to shared

**Files:**
- Create: `frontend/src/shared/lib/utils.ts`
- Create: `frontend/src/shared/hooks/use-mobile.ts`
- Create: `frontend/src/shared/ui/utils.ts`
- Modify: imports of `cn` and mobile helpers across frontend sources

**Interfaces:**
- Preserve all existing exported function names and signatures.

- [ ] **Step 1: Run the build as the characterization check**

Run: `npm run build`

- [ ] **Step 2: Move the helpers mechanically**

Use `git mv`; update imports without changing function bodies.

- [ ] **Step 3: Verify**

Run: `npm run build`

Expected: exit 0 with identical UI source contents apart from import paths.

- [ ] **Step 4: Commit**

```text
git add frontend/src/shared frontend/src/app frontend/src/pages frontend/src/features frontend/src/widgets
git commit -m "refactor: move generic frontend helpers to shared"
```

### Task 6: Move shared UI primitives batch one

**Files:**
- Move from `frontend/src/app/components/ui`: `accordion.tsx`, `alert.tsx`, `alert-dialog.tsx`, `aspect-ratio.tsx`, `avatar.tsx`, `badge.tsx`, `breadcrumb.tsx`, `button.tsx`, `calendar.tsx`, `card.tsx`, `carousel.tsx`, `chart.tsx`
- Modify all imports of those primitives

**Interfaces:**
- Preserve every component export, prop type, class string, variant map, and Radix binding.

- [ ] **Step 1: Run affected browser coverage**

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 2: Move files and update imports**

Use `git mv` and path-only import edits.

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/shared/ui frontend/src/app frontend/src/pages frontend/src/features frontend/src/widgets
git commit -m "refactor: move shared ui primitives batch one"
```

### Task 7: Move shared UI primitives batch two

**Files:**
- Move: `checkbox.tsx`, `collapsible.tsx`, `command.tsx`, `context-menu.tsx`, `date-time-picker.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `form.tsx`, `hover-card.tsx`, `input.tsx`, `input-otp.tsx`, `label.tsx`

**Interfaces:**
- Preserve every existing export and rendered class string.

- [ ] **Step 1: Run auth and teacher coverage**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 2: Move files and update imports only**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/shared/ui frontend/src/app frontend/src/pages frontend/src/features frontend/src/widgets
git commit -m "refactor: move shared ui primitives batch two"
```

### Task 8: Move shared UI primitives batch three

**Files:**
- Move: `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `slider.tsx`, `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toggle.tsx`, `toggle-group.tsx`, `tooltip.tsx`

**Interfaces:**
- Preserve the public exports and all Radix/MUI behavior.

- [ ] **Step 1: Run full existing E2E coverage as the baseline**

Run: `npm run test:e2e`

- [ ] **Step 2: Move files and update imports only**

- [ ] **Step 3: Run full build and E2E coverage**

Run: `npm run build`

Run: `npm run test:e2e`

- [ ] **Step 4: Commit**

```text
git add frontend/src/shared/ui frontend/src/app frontend/src/pages frontend/src/features frontend/src/widgets
git commit -m "refactor: complete shared ui primitive migration"
```

### Task 9: Move generic shared components into widget ownership

**Files:**
- Create: `frontend/src/widgets/layouts/dashboard-layout.tsx`
- Create: `frontend/src/widgets/layouts/stat-card.tsx`
- Create: `frontend/src/widgets/layouts/paginated-table.tsx`
- Create: `frontend/src/widgets/layouts/modal.tsx`
- Create: `frontend/src/widgets/layouts/badge.tsx`
- Create: `frontend/src/widgets/layouts/router-error-page.tsx`
- Move from `frontend/src/app/components/shared`: corresponding files

**Interfaces:**
- Preserve existing component names and props so page consumers need only path changes.

- [ ] **Step 1: Run role dashboard coverage**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts`

- [ ] **Step 2: Move components with unchanged bodies**

- [ ] **Step 3: Verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```text
git add frontend/src/widgets/layouts frontend/src/app frontend/src/pages frontend/src/features
git commit -m "refactor: move shared screen components to widgets"
```

### Task 10: Move HTTP transport to shared API

**Files:**
- Create: `frontend/src/shared/api/base-url.ts`
- Create: `frontend/src/shared/api/request.ts`
- Create: `frontend/src/shared/api/index.ts`
- Move from `frontend/src/app/services/http`: `base-url.ts`, `request.ts`

**Interfaces:**
- Preserve `PHP_BASE_URL` and `request<T>(method, path, body?, auth?)` exactly.

- [ ] **Step 1: Run API reference and auth specs**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 2: Move transport files and update domain imports**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/shared/api frontend/src/app/services frontend/src/app/features frontend/src/pages frontend/src/entities
git commit -m "refactor: move frontend http transport to shared"
```

### Task 11: Move domain-neutral API helpers

**Files:**
- Create: `frontend/src/shared/api/errors.ts`
- Create: `frontend/src/shared/api/auth-headers.ts`
- Modify: `frontend/src/shared/api/request.ts`
- Modify: request consumers

**Interfaces:**
- `request<T>` still returns `Promise<T>` and throws the same error messages for non-OK responses.

- [ ] **Step 1: Run the auth spec as the baseline**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts`

- [ ] **Step 2: Extract helpers without changing error text or headers**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/shared/api
git commit -m "refactor: isolate shared api request helpers"
```

### Task 12: Establish user entity slice

**Files:**
- Create: `frontend/src/entities/user/model/types.ts`
- Create: `frontend/src/entities/user/api/user-client.ts`
- Create: `frontend/src/entities/user/index.ts`
- Move relevant declarations from `frontend/src/app/data/types.ts` and `frontend/src/app/services/user.service.ts`

**Interfaces:**
- Preserve all `User` fields and user API function names.
- `entities/user/index.ts` is the only cross-slice public entrypoint.

- [ ] **Step 1: Run auth and admin-user coverage**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 2: Move user types/API into the entity slice**

- [ ] **Step 3: Verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```text
git add frontend/src/entities/user frontend/src/app/data frontend/src/app/services frontend/src/app/context
git commit -m "refactor: establish user entity slice"
```

### Task 13: Establish class entity slice

**Files:**
- Create: `frontend/src/entities/class/model/types.ts`
- Create: `frontend/src/entities/class/api/class-client.ts`
- Create: `frontend/src/entities/class/index.ts`
- Move class declarations and class service ownership

**Interfaces:**
- Preserve all class fields and API response shapes.

- [ ] **Step 1: Run teacher-class coverage**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 2: Move class type/API ownership**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/entities/class frontend/src/app/data frontend/src/app/services frontend/src/app/context
git commit -m "refactor: establish class entity slice"
```

### Task 14: Establish exam entity slice

**Files:**
- Create: `frontend/src/entities/exam/model/types.ts`
- Create: `frontend/src/entities/exam/api/exam-client.ts`
- Create: `frontend/src/entities/exam/index.ts`
- Move exam/question declarations and exam service ownership

**Interfaces:**
- Preserve `Exam`, `Question`, status, answer, and API payload types exactly.

- [ ] **Step 1: Run student exam and teacher exam coverage**

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 2: Move exam type/API ownership**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/entities/exam frontend/src/app/data frontend/src/app/services frontend/src/app/context
git commit -m "refactor: establish exam entity slice"
```

### Task 15: Establish submission/result entity slice

**Files:**
- Create: `frontend/src/entities/submission/model/types.ts`
- Create: `frontend/src/entities/submission/api/submission-client.ts`
- Create: `frontend/src/entities/submission/index.ts`
- Move result/submission declarations and result service ownership

**Interfaces:**
- Preserve submission, grade, answer, and result response shapes.

- [ ] **Step 1: Run grade and take-exam coverage**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-grade.spec.ts tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 2: Move result/submission ownership**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-grade.spec.ts tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/entities/submission frontend/src/app/data frontend/src/app/services frontend/src/app/context
git commit -m "refactor: establish submission entity slice"
```

### Task 16: Establish violation entity slice

**Files:**
- Create: `frontend/src/entities/violation/model/types.ts`
- Create: `frontend/src/entities/violation/api/violation-client.ts`
- Create: `frontend/src/entities/violation/index.ts`
- Move violation service ownership and types

**Interfaces:**
- Preserve violation case, severity, outcome, and API response shapes.

- [ ] **Step 1: Run violation coverage**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-violation-cases.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 2: Move violation ownership**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-violation-cases.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/entities/violation frontend/src/app/services frontend/src/app/context
git commit -m "refactor: establish violation entity slice"
```

### Task 17: Establish report, analytics, and API-doc entity slices

**Files:**
- Create: `frontend/src/entities/report/model/types.ts`
- Create: `frontend/src/entities/report/api/report-client.ts`
- Create: `frontend/src/entities/api-docs/model/types.ts`
- Create: `frontend/src/entities/api-docs/api/docs-client.ts`
- Create: `frontend/src/entities/report/index.ts`
- Create: `frontend/src/entities/api-docs/index.ts`
- Move `report.service.ts`, `docs.service.ts`, `endpoint-docs.ts`, and their types

**Interfaces:**
- Preserve report payloads, endpoint metadata, verification response shapes, and public function names.

- [ ] **Step 1: Run admin API and teacher analytics coverage**

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 2: Move report and documentation ownership**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/entities/report frontend/src/entities/api-docs frontend/src/app/services frontend/src/app/data
git commit -m "refactor: establish report and api docs entities"
```

### Task 18: Move authentication service into auth feature API

**Files:**
- Create: `frontend/src/features/auth/api/auth-client.ts`
- Create: `frontend/src/features/auth/model/auth-types.ts`
- Create: `frontend/src/features/auth/index.ts`
- Move auth service implementation from `frontend/src/app/services/auth.service.ts`

**Interfaces:**
- Preserve login/register/logout payloads and return types.

- [ ] **Step 1: Run auth coverage**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts`

- [ ] **Step 2: Move auth API and update imports**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/auth frontend/src/app/services frontend/src/app/context frontend/src/pages
git commit -m "refactor: move authentication api to auth feature"
```

### Task 19: Extract AppContext public types and storage

**Files:**
- Create: `frontend/src/app/providers/app-context.types.ts`
- Create: `frontend/src/app/providers/app-context.storage.ts`
- Move from current `frontend/src/app/context/app-context.types.ts` and `app-context.storage.ts`

**Interfaces:**
- Preserve the exact `AppContextType` property names and callback signatures.
- Preserve storage keys `examhub_token` and `examhub_user`.
- Before moving any dirty context file, capture its existing `git diff` and carry those user changes into the new provider-owned file without discarding them.

- [ ] **Step 1: Run auth and hydration coverage**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/infrastructure/hydration.spec.ts`

- [ ] **Step 2: Move types/storage without changing values**

- [ ] **Step 3: Verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```text
git add frontend/src/app/providers frontend/src/app/context frontend/src/app/App.tsx
git commit -m "refactor: isolate app context types and storage"
```

### Task 20: Extract AppContext selectors and auth domain

**Files:**
- Create: `frontend/src/app/providers/app-context.selectors.ts`
- Create: `frontend/src/app/providers/domains/auth-domain.ts`
- Move selector and auth-domain logic from current context files

**Interfaces:**
- Selectors remain pure functions.
- Auth domain continues to accept the same state setters and returns the same login/logout behavior.

- [ ] **Step 1: Run auth coverage**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts`

- [ ] **Step 2: Move selectors and auth orchestration**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/app/providers frontend/src/app/context
git commit -m "refactor: move app auth orchestration into provider"
```

### Task 21: Extract user and class context domains

**Files:**
- Create: `frontend/src/app/providers/domains/user-domain.ts`
- Create: `frontend/src/app/providers/domains/class-domain.ts`
- Move/update current domain implementations

**Interfaces:**
- Preserve all optimistic updates, loading states, and error handling.

- [ ] **Step 1: Run admin and teacher coverage**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts tests/e2e/auth/auth.spec.ts`

- [ ] **Step 2: Move domains and update entity imports**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts tests/e2e/auth/auth.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/app/providers frontend/src/app/context
git commit -m "refactor: move user and class context domains"
```

### Task 22: Extract exam and submission context domains

**Files:**
- Create: `frontend/src/app/providers/domains/exam-domain.ts`
- Create: `frontend/src/app/providers/domains/submission-domain.ts`
- Move/update current domain implementations

**Interfaces:**
- Preserve exam initialization, submission flow, grading, and local updates.

- [ ] **Step 1: Run student and teacher coverage**

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 2: Move domains and update entity imports**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/app/providers frontend/src/app/context
git commit -m "refactor: move exam and submission context domains"
```

### Task 23: Reassemble AppProvider with stable public API

**Files:**
- Create: `frontend/src/app/providers/AppProvider.tsx`
- Modify: `frontend/src/app/App.tsx`
- Delete after migration: `frontend/src/app/context/AppContext.tsx`

**Interfaces:**
- `useApp()` remains available from the app provider public module with the existing context shape.

- [ ] **Step 1: Run all context-dependent specs**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-exams.spec.ts tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 2: Reassemble provider from extracted domains**

```tsx
export function AppProvider({ children }: { children: React.ReactNode }) {
  // Preserve the existing state initialization and domain composition.
  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
```

The implementation must use the existing state and actions rather than introducing a new store.

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-exams.spec.ts tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/app/providers frontend/src/app/App.tsx frontend/src/app/context
git commit -m "refactor: reassemble app provider with stable contract"
```

### Task 24: Move authentication pages and feature UI

**Files:**
- Create: `frontend/src/pages/auth/login-page.tsx`
- Create: `frontend/src/pages/auth/register-page.tsx`
- Create: `frontend/src/features/auth/ui/login-form.tsx`
- Create: `frontend/src/features/auth/ui/register-form.tsx`
- Move from `frontend/src/app/pages/auth/Login.tsx` and `Register.tsx`

**Interfaces:**
- Preserve exported page component names through re-exports where route modules still reference them.

- [ ] **Step 1: Run auth baseline**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts`

- [ ] **Step 2: Move pages and extract only exact existing JSX**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/pages/auth frontend/src/features/auth frontend/src/app/pages/auth
git commit -m "refactor: move authentication pages into fsd layers"
```

### Task 25: Move role layouts into widgets

**Files:**
- Create: `frontend/src/widgets/layouts/admin-layout.tsx`
- Create: `frontend/src/widgets/layouts/teacher-layout.tsx`
- Create: `frontend/src/widgets/layouts/student-layout.tsx`
- Move role layout implementations from `frontend/src/app/pages/{admin,teacher,student}`

**Interfaces:**
- Preserve navigation labels, active-link behavior, responsive classes, and outlet composition.

- [ ] **Step 1: Run one spec per role**

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 2: Move layout code unchanged**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/widgets/layouts frontend/src/app/pages frontend/src/pages
git commit -m "refactor: move role layouts into widgets"
```

### Task 26: Move admin dashboard widget

**Files:**
- Create: `frontend/src/widgets/admin-dashboard/admin-dashboard-widget.tsx`
- Modify: `frontend/src/pages/admin/admin-dashboard-page.tsx`
- Move orchestration from `frontend/src/app/pages/admin/AdminDashboard.tsx`

**Interfaces:**
- Page entry exports the existing `AdminDashboard` route component name.

- [ ] **Step 1: Run admin API reference baseline**

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 2: Move dashboard composition without JSX changes**

- [ ] **Step 3: Verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```text
git add frontend/src/widgets/admin-dashboard frontend/src/pages/admin frontend/src/app/pages/admin
git commit -m "refactor: move admin dashboard composition to widget"
```

### Task 27: Move student dashboard widget

**Files:**
- Create: `frontend/src/widgets/student-dashboard/student-dashboard-widget.tsx`
- Modify: `frontend/src/pages/student/student-dashboard-page.tsx`
- Move orchestration from `StudentDashboard.tsx`

**Interfaces:**
- Preserve dashboard metrics, cards, links, and loading behavior.

- [ ] **Step 1: Run student baseline**

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 2: Move composition unchanged**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/widgets/student-dashboard frontend/src/pages/student frontend/src/app/pages/student
git commit -m "refactor: move student dashboard composition to widget"
```

### Task 28: Move teacher dashboard widget

**Files:**
- Create: `frontend/src/widgets/teacher-dashboard/teacher-dashboard-widget.tsx`
- Modify: `frontend/src/pages/teacher/teacher-dashboard-page.tsx`
- Move orchestration from `TeacherDashboard.tsx`

**Interfaces:**
- Preserve teacher metrics, links, and role-specific shell behavior.

- [ ] **Step 1: Run teacher baseline**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 2: Move composition unchanged**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/widgets/teacher-dashboard frontend/src/pages/teacher frontend/src/app/pages/teacher
git commit -m "refactor: move teacher dashboard composition to widget"
```

### Task 29: Move student take-exam pure logic

**Files:**
- Create: `frontend/src/features/student/take-exam/model/constants.ts`
- Create: `frontend/src/features/student/take-exam/model/focus-violation-state.ts`
- Create: `frontend/src/features/student/take-exam/model/session.ts`
- Create: `frontend/src/features/student/take-exam/model/submission.ts`
- Move pure logic from current take-exam sources

**Interfaces:**
- Preserve timer formatting, focus violation thresholds, answer state, and submission payloads.

- [ ] **Step 1: Run take-exam baseline**

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 2: Move pure logic without changing constants or branches**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/student/take-exam frontend/src/app/features/student/take-exam frontend/src/app/pages/student
git commit -m "refactor: isolate student exam attempt logic"
```

### Task 30: Move student take-exam hooks

**Files:**
- Create: `frontend/src/features/student/take-exam/model/use-exam-session.ts`
- Create: `frontend/src/features/student/take-exam/model/use-exam-anti-cheat.ts`
- Move current `useExamSession.ts` and `useExamAntiCheat.ts`

**Interfaces:**
- Preserve hook return values, effect dependencies, event listeners, timers, and cleanup.

- [ ] **Step 1: Run take-exam baseline**

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 2: Move hooks unchanged**

- [ ] **Step 3: Verify**

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/student/take-exam frontend/src/app/features/student/take-exam
git commit -m "refactor: move student exam session hooks"
```

### Task 31: Move student take-exam UI sections

**Files:**
- Create under `frontend/src/features/student/take-exam/ui`: `auto-submit-overlay.tsx`, `exam-header.tsx`, `exam-navigation.tsx`, `exam-start-screen.tsx`, `question-card.tsx`, `question-navigator.tsx`, `submitted-exam-state.tsx`, `violation-warning-overlay.tsx`
- Modify: `frontend/src/pages/student/take-exam-page.tsx`
- Move from current feature/page files

**Interfaces:**
- Preserve all JSX, text, class strings, ARIA attributes, and event callback signatures exactly.

- [ ] **Step 1: Run take-exam baseline**

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 2: Copy JSX sections mechanically and update only imports**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/student/take-exam frontend/src/pages/student frontend/src/app/features/student/take-exam frontend/src/app/pages/student
git commit -m "refactor: move student take exam ui sections"
```

### Task 32: Move teacher exams feature

**Files:**
- Create under `frontend/src/features/teacher/exams`: `model/constants.ts`, `model/exam-form.ts`, `model/use-teacher-exam-editor.ts`, `ui/empty-exams-state.tsx`, `ui/exam-card.tsx`, `ui/exam-editor-modal.tsx`, `ui/exam-filter-tabs.tsx`, `ui/question-editor-card.tsx`, `ui/violations-modal.tsx`
- Modify: `frontend/src/pages/teacher/teacher-exams-page.tsx`
- Move from current teacher exam sources

**Interfaces:**
- Preserve validation messages, status transitions, modal state, and all teacher exam DOM output.

- [ ] **Step 1: Run teacher exam baseline**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 2: Move pure form logic first, then exact UI sections**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/teacher/exams frontend/src/pages/teacher frontend/src/app/features/teacher/exams frontend/src/app/pages/teacher
git commit -m "refactor: move teacher exams feature"
```

### Task 33: Move teacher grade feature

**Files:**
- Create under `frontend/src/features/teacher/grade`: `model/use-submission-violations.ts`, `ui/exam-selection-chips.tsx`, `ui/grade-filter-tabs.tsx`, `ui/grade-submission-view.tsx`, `ui/submissions-table.tsx`, `ui/submission-violations-modal.tsx`
- Modify: `frontend/src/pages/teacher/teacher-grade-page.tsx`
- Move from current teacher grade sources

**Interfaces:**
- Preserve grade editing, filter state, submission updates, and violation modal behavior.

- [ ] **Step 1: Run grade baseline**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 2: Move hooks and exact UI sections**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/teacher/grade frontend/src/pages/teacher frontend/src/app/features/teacher/grade frontend/src/app/pages/teacher
git commit -m "refactor: move teacher grade feature"
```

### Task 34: Move teacher violation-case feature

**Files:**
- Create under `frontend/src/features/teacher/violation-cases`: `model/constants.ts`, `model/case-meta.tsx`, `model/use-violation-cases.ts`, `ui/review-modal.tsx`, `ui/violation-cases-table.tsx`
- Modify: `frontend/src/pages/teacher/teacher-violation-cases-page.tsx`
- Move current violation-case sources

**Interfaces:**
- Preserve severity/outcome labels, case metadata, review actions, loading states, and table markup.

- [ ] **Step 1: Run violation baseline**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-violation-cases.spec.ts`

- [ ] **Step 2: Move pure metadata and orchestration, then exact UI sections**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-violation-cases.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/teacher/violation-cases frontend/src/pages/teacher frontend/src/app/features/teacher/violation-cases frontend/src/app/pages/teacher
git commit -m "refactor: move teacher violation cases feature"
```

### Task 35: Move question analytics feature

**Files:**
- Create under `frontend/src/features/analytics/question-analytics`: `model/filters.ts`, `model/formatters.ts`, `ui/empty-state.tsx`, `ui/list-card.tsx`, `question-analytics-section.tsx`
- Modify: analytics consumers
- Move current `QuestionAnalyticsSection.tsx` and nested helpers

**Interfaces:**
- Preserve score tone, time formatting, filter semantics, and empty-state markup.

- [ ] **Step 1: Run analytics-adjacent teacher coverage**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 2: Move pure helpers and exact UI sections**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-grade.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/analytics frontend/src/app/components/analytics frontend/src/app/features/analytics frontend/src/pages frontend/src/widgets
git commit -m "refactor: move question analytics feature"
```

### Task 36: Move admin API reference feature

**Files:**
- Create under `frontend/src/features/admin/api-reference`: `model/api-reference.ts`, `model/endpoint-code-map.ts`, `ui/copy-button.tsx`, `ui/endpoint-card.tsx`, `ui/method-badge.tsx`, `ui/php-backend-panel.tsx`, `ui/try-it-panel.tsx`, `ui/verification-badge.tsx`, `ui/verification-panel.tsx`
- Modify: `frontend/src/pages/admin/admin-api-reference-page.tsx`
- Move current admin API reference feature sources

**Interfaces:**
- Preserve endpoint grouping, copy behavior, verification requests, and all endpoint cards.

- [ ] **Step 1: Run admin API reference baseline**

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 2: Move helpers and exact components**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/admin/api-reference frontend/src/pages/admin frontend/src/app/features/admin frontend/src/app/pages/admin
git commit -m "refactor: move admin api reference feature"
```

### Task 37: Move import/export and accommodations features

**Files:**
- Create: `frontend/src/features/import-export/ui/import-export-tools.tsx`
- Create: `frontend/src/features/import-export/model/import-export-utils.ts`
- Create: `frontend/src/features/exam-accommodations/ui/exam-accommodations-modal.tsx`
- Create: `frontend/src/features/exam-accommodations/api/accommodation-client.ts`
- Move current import/export and accommodation sources

**Interfaces:**
- Preserve file formats, download behavior, accommodation form fields, modal flow, and API payloads.

- [ ] **Step 1: Run admin and student flows that load these features**

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 2: Move feature code unchanged**

- [ ] **Step 3: Verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```text
git add frontend/src/features/import-export frontend/src/features/exam-accommodations frontend/src/app/features frontend/src/app/services frontend/src/pages
git commit -m "refactor: move import and accommodation features"
```

### Task 38: Move remaining admin page entries

**Files:**
- Create/modify: `frontend/src/pages/admin/admin-classes-page.tsx`, `admin-exams-page.tsx`, `admin-logs-page.tsx`, `admin-profile-page.tsx`, `admin-reports-page.tsx`, `admin-results-page.tsx`, `admin-tools-page.tsx`, `admin-users-page.tsx`, `admin-violations-page.tsx`
- Move from `frontend/src/app/pages/admin/**`

**Interfaces:**
- Preserve all exported route component names through page-local named exports or explicit route imports.

- [ ] **Step 1: Run admin API reference baseline**

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 2: Move page entries and update route imports only**

- [ ] **Step 3: Verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```text
git add frontend/src/pages/admin frontend/src/app/pages/admin
git commit -m "refactor: move remaining admin pages"
```

### Task 39: Move remaining teacher page entries

**Files:**
- Create/modify: `frontend/src/pages/teacher/teacher-analytics-page.tsx`, `teacher-classes-page.tsx`, `teacher-profile-page.tsx`, `teacher-tools-page.tsx`
- Move from `frontend/src/app/pages/teacher/**`

**Interfaces:**
- Preserve route-facing component names and rendered page behavior.

- [ ] **Step 1: Run teacher coverage**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts tests/e2e/teacher/teacher-grade.spec.ts tests/e2e/teacher/teacher-violation-cases.spec.ts`

- [ ] **Step 2: Move thin page entries and update imports only**

- [ ] **Step 3: Verify**

Run: `npm run build`

- [ ] **Step 4: Commit**

```text
git add frontend/src/pages/teacher frontend/src/app/pages/teacher
git commit -m "refactor: move remaining teacher pages"
```

### Task 40: Move remaining student and public page entries

**Files:**
- Create/modify: `frontend/src/pages/student/student-classes-page.tsx`, `student-exams-page.tsx`, `student-profile-page.tsx`, `student-results-page.tsx`, `exam-taking-preview-page.tsx`, `take-exam-page.tsx`, `frontend/src/pages/public/landing-page.tsx`
- Move from current student/public page files

**Interfaces:**
- Preserve route exports, student navigation, exam preview behavior, and landing page markup.

- [ ] **Step 1: Run student and auth coverage**

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts tests/e2e/auth/auth.spec.ts`

- [ ] **Step 2: Move pages and update imports only**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts tests/e2e/auth/auth.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/pages/student frontend/src/pages/public frontend/src/app/pages/student frontend/src/app/pages/public
git commit -m "refactor: move remaining student and public pages"
```

### Task 41: Move TanStack route sources into app/router

**Files:**
- Create: `frontend/src/app/router/routes/__root.tsx`
- Create: `frontend/src/app/router/routes/index.tsx`
- Create: `frontend/src/app/router/routes/$.tsx`
- Move from `frontend/src/routes/**`

**Interfaces:**
- Preserve route IDs, paths, `createRootRoute`, `createFileRoute`, shell document, hydration guard, and stylesheet URL import.

- [ ] **Step 1: Run hydration and full build baseline**

Run: `npm run test:e2e -- tests/e2e/infrastructure/hydration.spec.ts`

Run: `npm run build`

- [ ] **Step 2: Move route files and let the configured generator rebuild**

- [ ] **Step 3: Verify route generation and hydration**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/infrastructure/hydration.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/app/router/routes frontend/src/routes frontend/tsr.config.json
git commit -m "refactor: move tanstack route sources into app"
```

### Task 42: Move router entry and generated tree

**Files:**
- Create: `frontend/src/app/router/router.tsx`
- Create: `frontend/src/app/router/routeTree.gen.ts`
- Move/update `frontend/src/router.tsx` and generated `src/routeTree.gen.ts`
- Modify: `frontend/src/app/App.tsx`

**Interfaces:**
- `getRouter()` continues to create the same router with `scrollRestoration: true` and the same registered router type.

- [ ] **Step 1: Run all route-facing E2E specs**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/admin/admin-api-reference.spec.ts tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 2: Move router entry and generated file**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/admin/admin-api-reference.spec.ts tests/e2e/student/take-exam.spec.ts tests/e2e/teacher/teacher-exams.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/app/router frontend/src/app/App.tsx frontend/src/router.tsx frontend/src/routeTree.gen.ts
git commit -m "refactor: move router entry and generated tree into app"
```

### Task 43: Move app bootstrap and assets to final ownership

**Files:**
- Modify: `frontend/src/app/App.tsx`
- Move: `frontend/src/app/assets/**` to `frontend/src/app/assets/**` only if the final router/app path requires import normalization
- Create: `frontend/src/app/index.ts`
- Create: `frontend/src/app/providers/index.ts`

**Interfaces:**
- Preserve lazy toaster behavior, `AppProvider`, router creation, and `app-shell` markup exactly.

- [ ] **Step 1: Run hydration baseline**

Run: `npm run test:e2e -- tests/e2e/infrastructure/hydration.spec.ts`

- [ ] **Step 2: Normalize app bootstrap exports without changing JSX**

- [ ] **Step 3: Verify**

Run: `npm run build`

Run: `npm run test:e2e -- tests/e2e/infrastructure/hydration.spec.ts`

- [ ] **Step 4: Commit**

```text
git add frontend/src/app
git commit -m "refactor: finalize app bootstrap ownership"
```

### Task 44: Remove legacy source ownership roots

**Files:**
- Delete after all imports are migrated: `frontend/src/app/components/**`, `frontend/src/app/context/**`, `frontend/src/app/data/**`, `frontend/src/app/features/**`, `frontend/src/app/pages/**`, `frontend/src/app/services/**`, `frontend/src/routes/**`, `frontend/src/router.tsx`, `frontend/src/routeTree.gen.ts`
- Modify: any remaining imports found by `rg`

**Interfaces:**
- No legacy path remains in production source.

- [ ] **Step 1: Prove no production import uses legacy paths**

Run: `rg -n "src/app/(components|context|data|features|pages|services)|from ['\"]@/app/(components|context|data|features|pages|services)|from ['\"]\.\.?/.*app/(components|context|data|features|pages|services)" frontend/src`

Expected: no matches.

- [ ] **Step 2: Delete only empty/fully migrated legacy roots**

Use `git rm` with explicit paths after confirming each target contains no user-only changes.

- [ ] **Step 3: Verify build and full E2E**

Run: `npm run build`

Run: `npm run test:e2e`

- [ ] **Step 4: Commit**

```text
git add frontend/src
git commit -m "refactor: remove legacy frontend ownership roots"
```

### Task 45: Enforce architecture through package scripts

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/README.md`

**Interfaces:**
- Add `test:architecture` without changing existing `build`, `dev`, or E2E commands.

- [ ] **Step 1: Add the script**

```json
{
  "scripts": {
    "test:architecture": "node --test scripts/check-fsd-boundaries.test.mjs scripts/check-source-size.test.mjs && node scripts/check-fsd-boundaries.mjs --enforce && node scripts/check-source-size.mjs --enforce"
  }
}
```

- [ ] **Step 2: Run the new gate and verify the expected red/green state**

Run: `npm run test:architecture`

Expected: PASS with empty violation arrays and no hard-limit source files.

- [ ] **Step 3: Commit**

```text
git add frontend/package.json frontend/scripts frontend/README.md
git commit -m "ci: enforce frontend fsd architecture"
```

### Task 46: Add final architecture documentation

**Files:**
- Modify: `frontend/README.md`
- Create: `docs/architecture/frontend-fsd.md`

**Interfaces:**
- Documentation must describe the actual final folders, public entrypoints, boundary command, build command, and E2E commands.

- [ ] **Step 1: Document the final layer rules**

Include the exact layer direction `shared <- entities <- features <- widgets <- pages <- app`, the no-deep-import rule, the no-legacy-root rule, and the UI preservation rule.

- [ ] **Step 2: Verify documentation paths and command examples**

Run: `npm run test:architecture`

- [ ] **Step 3: Commit**

```text
git add frontend/README.md docs/architecture/frontend-fsd.md
git commit -m "docs: document frontend fsd architecture"
```

### Task 47: Run targeted regression matrix

**Files:**
- No production source changes expected.
- Modify only task-owned files if a verified structural regression is found.

**Interfaces:**
- Every existing scenario remains available under its original path.

- [ ] **Step 1: Run auth and infrastructure**

Run: `npm run test:e2e -- tests/e2e/auth/auth.spec.ts tests/e2e/infrastructure/hydration.spec.ts`

- [ ] **Step 2: Run student**

Run: `npm run test:e2e -- tests/e2e/student/take-exam.spec.ts`

- [ ] **Step 3: Run teacher**

Run: `npm run test:e2e -- tests/e2e/teacher/teacher-exams.spec.ts tests/e2e/teacher/teacher-grade.spec.ts tests/e2e/teacher/teacher-violation-cases.spec.ts`

- [ ] **Step 4: Run admin**

Run: `npm run test:e2e -- tests/e2e/admin/admin-api-reference.spec.ts`

- [ ] **Step 5: Commit only if a structural regression was corrected**

```text
git add frontend/src frontend/scripts
git commit -m "fix: resolve targeted frontend fsd regressions"
```

### Task 48: Run the complete local quality gate

**Files:**
- No source changes expected.

- [ ] **Step 1: Run the production build**

Run: `npm run build`

Expected: exit code 0; any existing TanStack external-import warnings are reported but do not fail the build.

- [ ] **Step 2: Run architecture checks**

Run: `npm run test:architecture`

Expected: all Node tests pass, no upward imports, no legacy owners, and no hard-limit files.

- [ ] **Step 3: Run the full E2E suite**

Run: `npm run test:e2e`

Expected: every existing Playwright test passes without focused or skipped tests.

- [ ] **Step 4: Commit verification evidence if project convention requires it**

```text
git status --short
git diff --check
git log --oneline --decorate -45
```

Do not create an empty commit. If no source/documentation adjustment is required, record the verification in the handoff instead.

### Task 49: Audit task scope and commit count

**Files:**
- No production source changes expected.

- [ ] **Step 1: Confirm unrelated changes were not staged**

Run: `git status --short; git diff --cached --name-status`

Expected: no unrelated backend or pre-existing frontend changes are included in the task commits.

- [ ] **Step 2: Confirm implementation commit count**

Run: `git log --format=%s 914b7f2..HEAD | Measure-Object -Line`

Expected: at least 40 implementation commit subjects after the design commit.

- [ ] **Step 3: Confirm final source shape**

Run: `rg --files frontend/src | Sort-Object`

Expected: production owners are limited to `shared`, `entities`, `features`, `widgets`, `pages`, and `app`, with only the expected `main.tsx`/environment entrypoints outside those directories.

### Task 50: Final handoff and remote CI status

**Files:**
- No source changes expected.

- [ ] **Step 1: Capture final verification output**

Run:

```text
cd frontend
npm run build
npm run test:architecture
npm run test:e2e
```

- [ ] **Step 2: Inspect the final diff and commit list**

Run from repository root:

```text
git diff --check 914b7f2..HEAD
git status --short
git log --oneline --decorate 914b7f2..HEAD
```

- [ ] **Step 3: Report remote CI accurately**

If GitHub Actions access is available, inspect the corresponding run. If no workflow or credentials are available, explicitly report remote CI as unverified and include the fresh local command output.

## Plan self-review

- Spec coverage: the plan includes strict layer ownership, route-generator relocation, context preservation, service/entity migration, feature/widget/page migration, architecture enforcement, UI invariants, dirty-worktree protection, 40+ commits, build verification, and full E2E verification.
- Placeholder scan: no unresolved planning markers remain. Any conditional wording identifies a concrete path decision that must be made from repository state before staging.
- Type consistency: `useApp`, `request<T>`, entity public entrypoints, and route generator paths are named consistently across tasks.
- Risk review: generated routes, shared primitives, context state, and exam anti-cheat behavior each have targeted pre/post verification.
