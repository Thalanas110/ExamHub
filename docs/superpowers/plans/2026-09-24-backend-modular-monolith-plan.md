# Backend Modular Monolith Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Refactor the vanilla PHP backend into a PHP 8.5 modular monolith without changing any observable backend behavior.

**Architecture:** Keep one Apache/PHP deployment and one api/index.php entrypoint. Organize business code under backend/src/Modules/<Context>/{Domain,Application,Infrastructure,Presentation} and cross-cutting code under backend/src/Shared. Wire all concrete dependencies through one PHP composition root, with no legacy namespace facades.

**Tech Stack:** Vanilla PHP 8.5.x, Composer PSR-4 autoloading, PDO MySQL/MariaDB, Apache, existing standalone PHP tests, existing SQL stored routines and migrations.

## Global Constraints

- Runtime target is PHP 8.5.x; Docker uses php:8.5-apache.
- No PHP framework, Node.js backend, PHPUnit requirement, or runtime dependency.
- Preserve endpoint paths, methods, response shapes, status codes, errors, auth, encryption, SQL behavior, and deployment entrypoints.
- No compatibility facades for App\Controllers, App\Services, App\Routing\Routes, or App\Logging.
- Do not change database migration semantics or order.
- Exactly 50 implementation commits; each is coherent and testable.
- Write/run a failing or characterization test before production changes.
- Run git diff --check after every commit.

## Final structure

backend/src/Application, Bootstrap, Shared/{Config,Database,Http,Observability,Security,Support}, and Modules/{Admin,Auth,Classes,Data,Docs,Exams,Health,Reports,Results,Users,Violations}; each module uses Domain/Application/Infrastructure/Presentation where needed. Application depends on ports/contracts, Infrastructure implements ports, Presentation owns controllers/routes, and no module imports another module's Infrastructure.

## Tasks

### Task 1: Capture baseline

- [ ] Files and deliverable: Create backend/tests/architecture/backend-baseline.php and docs/backend-modular-monolith-baseline.md. Record PHP 8.5.10, route inventory, source inventory, Docker image, Composer requirement, and all existing test commands. Run the baseline script and git diff --check. Commit: test: capture backend modularization baseline.

- [ ] Commit exactly this task with the stated commit message.

### Task 2: Aggregate test command

- [ ] Files and deliverable: Create backend/tests/run_all.php and add the Composer test script without removing existing scripts. Execute each standalone PHP test in fixed order and preserve failure codes. Run php backend/tests/run_all.php. Commit: test: add aggregate backend test command.

- [ ] Commit exactly this task with the stated commit message.

### Task 3: Router characterization

- [ ] Files and deliverable: Create backend/tests/RouterContractTest.php covering matching, params, OPTIONS, 401, 403, 404, ApiException mapping, and metadata. Run it against the current router before moving code. Commit: test: characterize router contracts.

- [ ] Commit exactly this task with the stated commit message.

### Task 4: Architecture scanner

- [ ] Files and deliverable: Create backend/tests/architecture/ArchitectureBoundaryTest.php with dependency-free namespace/import scanning and fixtures. Verify it detects legacy imports and forbidden module infrastructure imports. Commit: test: add backend architecture boundary scanner.

- [ ] Commit exactly this task with the stated commit message.

### Task 5: Shared support

- [ ] Files and deliverable: Move Support/ApiException.php and Helpers.php to Shared/Support, update all imports, and preserve public methods. Run SecuritySmokeTest.php and RequestInvalidJsonTest.php. Commit: refactor: move shared errors and helpers.

- [ ] Commit exactly this task with the stated commit message.

### Task 6: Shared config

- [ ] Files and deliverable: Move Config/AppConfig.php and Env.php to Shared/Config, add SharedConfigTest.php for PHP 8.5 parsing, update every consumer, and run config/PDO tests. Commit: refactor: move configuration into shared namespace.

- [ ] Commit exactly this task with the stated commit message.

### Task 7: Shared HTTP

- [ ] Files and deliverable: Move Http classes and Routing/Router.php to Shared/Http, update namespaces and consumers, and preserve headers, CORS, transport, JSON, and router behavior. Run HTTP and RouterContractTest.php. Commit: refactor: move HTTP platform code into shared namespace.

- [ ] Commit exactly this task with the stated commit message.

### Task 8: Shared database

- [ ] Files and deliverable: Move Database classes to Shared/Database, update scripts and imports, and preserve PDO, SSL, routine, and SQL runner behavior. Run MysqlPdoFactoryTest.php and SqlScriptRunnerTest.php. Commit: refactor: move database infrastructure into shared namespace.

- [ ] Commit exactly this task with the stated commit message.

### Task 9: Shared security

- [ ] Files and deliverable: Move Security classes to Shared/Security, update consumers, and preserve AES, legacy decrypt, JWT, expiry, and password behavior. Run SecuritySmokeTest.php, EncryptionStorageCompatibilityTest.php, and TransportPayloadEnvelopeTest.php. Commit: refactor: move security primitives into shared namespace.

- [ ] Commit exactly this task with the stated commit message.

### Task 10: Shared observability

- [ ] Files and deliverable: Move RequestLogService, AuditLogService, and LogRetentionService to Shared/Observability, preserve fail-open behavior, add null-gateway coverage, and run aggregate tests. Commit: refactor: move shared observability infrastructure.

- [ ] Commit exactly this task with the stated commit message.

### Task 11: Application bootstrap contract

- [ ] Files and deliverable: Create Application/BackendApplication.php and Application/ModuleRegistry.php as plain PHP composition contracts. Keep lifecycle services and route registration behavior unchanged. Run router and aggregate tests. Commit: refactor: introduce backend application composition contract.

- [ ] Commit exactly this task with the stated commit message.

### Task 12: Auth domain

- [ ] Files and deliverable: Create Modules/Auth/Domain/AuthUser.php, AuthenticationContext.php, and AuthRepository.php with PHP 8.5 value objects/contracts. Add AuthDomainTest.php and run its red-green cycle. Commit: refactor: define auth module domain contracts.

- [ ] Commit exactly this task with the stated commit message.

### Task 13: Auth application

- [ ] Files and deliverable: Move AuthService.php to Modules/Auth/Application, split auth-specific normalization/mapping, inject AuthRepository and shared security services, and preserve register/login/logout/token/profile behavior. Run AuthSessionIdleTimeoutTest.php. Commit: refactor: move auth application operations.

- [ ] Commit exactly this task with the stated commit message.

### Task 14: Auth adapter

- [ ] Files and deliverable: Create Modules/Auth/Infrastructure/RoutineAuthRepository.php and move auth routine calls behind the port without changing names, args, transactions, or rows. Run repository and auth tests when DB credentials exist. Commit: refactor: isolate auth persistence adapter.

- [ ] Commit exactly this task with the stated commit message.

### Task 15: Auth presentation

- [ ] Files and deliverable: Move AuthController.php and AuthRoutes.php into Modules/Auth/Presentation, register identical routes/roles, update imports, delete legacy files, and run router/auth/security/aggregate tests. Commit: refactor: cut over auth module routes.

- [ ] Commit exactly this task with the stated commit message.

### Task 16: Users domain

- [ ] Files and deliverable: Create Users/Domain/User.php, UserRepository.php, and Users/Application/UserMapper.php; extract user/profile mapping from the old mapper while preserving decrypted fields. Add UserMapperTest.php. Commit: refactor: define users module contracts and mapping.

- [ ] Commit exactly this task with the stated commit message.

### Task 17: Users application

- [ ] Files and deliverable: Move UserService.php to Users/Application and split ProfileService.php, preserving all validation, errors, CRUD, and profile behavior. Run UserServiceValidationTest.php and aggregate tests. Commit: refactor: move users application operations.

- [ ] Commit exactly this task with the stated commit message.

### Task 18: Users adapter

- [ ] Files and deliverable: Create Users/Infrastructure/RoutineUserRepository.php, encapsulate all user/profile routines, preserve duplicate-email translation, and run repository/user validation tests. Commit: refactor: isolate users persistence adapter.

- [ ] Commit exactly this task with the stated commit message.

### Task 19: Users presentation

- [ ] Files and deliverable: Move ProfileController, UsersController, ProfileRoutes, and UserRoutes into Users/Presentation, register identical endpoints/roles, delete legacy files, and run user/auth/router tests. Commit: refactor: cut over users module routes.

- [ ] Commit exactly this task with the stated commit message.

### Task 20: Classes application

- [ ] Files and deliverable: Move ClassService.php to Classes/Application, create ClassRepository.php and ClassMapper.php, extract class mapping, and preserve membership behavior. Add mapper coverage and run class tests. Commit: refactor: move classes application layer.

- [ ] Commit exactly this task with the stated commit message.

### Task 21: Classes adapter

- [ ] Files and deliverable: Create Classes/Infrastructure/RoutineClassRepository.php for CRUD/join/leave/enrollment/removal routines and preserve args/results. Run repository and aggregate tests. Commit: refactor: isolate classes persistence adapter.

- [ ] Commit exactly this task with the stated commit message.

### Task 22: Classes presentation

- [ ] Files and deliverable: Move ClassesController.php and ClassRoutes.php into Classes/Presentation, register original endpoints/order/roles, delete legacy files, and run router/class tests. Commit: refactor: cut over classes module routes.

- [ ] Commit exactly this task with the stated commit message.

### Task 23: Exams domain

- [ ] Files and deliverable: Move ExamPayloadValidator.php to Exams/Domain, split exam mapping/normalization into Exams, create ExamRepository.php, and add ExamMappingTest.php. Preserve questions, dates, marks, order, and fields. Commit: refactor: define exams domain and mapping boundaries.

- [ ] Commit exactly this task with the stated commit message.

### Task 24: Exam CRUD

- [ ] Files and deliverable: Move ExamService.php to Exams/Application, inject the exam contract, add valid/invalid service contract coverage, and run exam validation/mapping tests. Commit: refactor: move exam CRUD application operations.

- [ ] Commit exactly this task with the stated commit message.

### Task 25: Accommodations

- [ ] Files and deliverable: Move StudentExamAccommodationService.php to Exams/Application, create AccommodationPolicy.php, preserve schedule/attempt/accessibility behavior, and run accommodation/result validation tests. Commit: refactor: move exam accommodation operations.

- [ ] Commit exactly this task with the stated commit message.

### Task 26: Exams adapter

- [ ] Files and deliverable: Create Exams/Infrastructure/RoutineExamRepository.php for exam, accommodation, policy, and membership routines. Preserve SQL names/args/transactions/rows and run repository/exam tests. Commit: refactor: isolate exams persistence adapter.

- [ ] Commit exactly this task with the stated commit message.

### Task 27: Exams presentation

- [ ] Files and deliverable: Move ExamsController.php and ExamRoutes.php into Exams/Presentation, register all exam/accommodation routes and roles in original order, delete legacy files, and run exam/router tests. Commit: refactor: cut over exams module routes.

- [ ] Commit exactly this task with the stated commit message.

### Task 28: Results domain

- [ ] Files and deliverable: Create Results/Domain/Submission.php and ResultRepository.php, move answer validation to AnswerPayloadValidator.php, add validator coverage, and preserve accepted shapes/errors. Commit: refactor: define results domain contracts.

- [ ] Commit exactly this task with the stated commit message.

### Task 29: Result attempts

- [ ] Files and deliverable: Move start/submit operations into Results/Application with StartAttempt.php and SubmitResult.php, preserve legacy examId submits, explicit submissionId submits, limits, timing, and expiry. Run attempt-flow tests. Commit: refactor: move result attempt and submission operations.

- [ ] Commit exactly this task with the stated commit message.

### Task 30: Result grading

- [ ] Files and deliverable: Create GradeResult.php and ResultMapper.php, move grading/feedback/telemetry operations, preserve encryption and public graded-answer fields, and run result/encryption tests. Commit: refactor: split result grading application operations.

- [ ] Commit exactly this task with the stated commit message.

### Task 31: Results adapter

- [ ] Files and deliverable: Create Results/Infrastructure/RoutineResultRepository.php for submission/attempt/answer/telemetry calls, preserve transactions, and run repository plus aggregate tests. Commit: refactor: isolate results persistence adapter.

- [ ] Commit exactly this task with the stated commit message.

### Task 32: Results presentation

- [ ] Files and deliverable: Move ResultsController.php and ResultRoutes.php into Results/Presentation, register identical routes/roles, delete legacy files, and run result/router tests. Commit: refactor: cut over results module routes.

- [ ] Commit exactly this task with the stated commit message.

### Task 33: Reports

- [ ] Files and deliverable: Move ReportService.php and QuestionAnalyticsBuilder.php into Reports application/domain, create RoutineReportRepository.php, move report controller/routes, preserve filters/aggregates/zero rows, and run report tests. Commit: refactor: move reports module.

- [ ] Commit exactly this task with the stated commit message.

### Task 34: Admin

- [ ] Files and deliverable: Move AdminController/AdminRoutes and AdminLogReadService into Admin, add AdminReadService, preserve reports/log reads/pagination/roles/fail-open behavior, and run admin tests. Commit: refactor: move admin module.

- [ ] Commit exactly this task with the stated commit message.

### Task 35: Violations domain

- [ ] Files and deliverable: Move ViolationCaseService.php into Violations/Application, create ViolationCase.php and ViolationRepository.php, preserve validation/status/reviewer fields, and add domain tests. Commit: refactor: define violations domain operations.

- [ ] Commit exactly this task with the stated commit message.

### Task 36: Violations adapter

- [ ] Files and deliverable: Move ExamViolationService into Violations/Infrastructure and create RoutineViolationRepository.php, preserving event payloads, routines, optional logs, and ordering. Run violation/aggregate tests. Commit: refactor: isolate violations persistence.

- [ ] Commit exactly this task with the stated commit message.

### Task 37: Violations presentation

- [ ] Files and deliverable: Move ExamViolationsController and ExamViolationRoutes into Violations/Presentation, register unchanged endpoints/roles, delete legacy logging/violation files, and run architecture tests. Commit: refactor: cut over violations module routes.

- [ ] Commit exactly this task with the stated commit message.

### Task 38: Data application

- [ ] Files and deliverable: Move DataService, SeedService, EncryptionRepairService, and LegacyEncryptedDataRepair into Data/Application, preserve seed/CSV/repair behavior, update scripts, and run encryption/SQL tests. Commit: refactor: move data operations.

- [ ] Commit exactly this task with the stated commit message.

### Task 39: Data presentation

- [ ] Files and deliverable: Move DataController/DataRoutes into Data/Presentation, preserve /data/all and /data/reseed, update every script, run php -l on scripts, and delete legacy files. Commit: refactor: cut over data module and scripts.

- [ ] Commit exactly this task with the stated commit message.

### Task 40: Docs and health

- [ ] Files and deliverable: Move ApiDocsVerificationService, DocsController/Routes, and HealthController/Routes into Docs and Health modules, preserve output, run syntax/docs/health tests, and delete old files. Commit: refactor: move docs and health modules.

- [ ] Commit exactly this task with the stated commit message.

### Task 41: Module route registry

- [ ] Files and deliverable: Delete Routing/Routes/ApiRouteRegistry.php, make ModuleRegistry register modules in the exact old order, and run endpoint inventory plus router tests. Commit: refactor: register routes through modules.

- [ ] Commit exactly this task with the stated commit message.

### Task 42: Module factories

- [ ] Files and deliverable: Create Application/SharedServices.php and module factories, delete Bootstrap/ServiceContainer.php, and wire all adapters/services/controllers/routes through one composition root. Run architecture and aggregate tests. Commit: refactor: compose backend through module factories.

- [ ] Commit exactly this task with the stated commit message.

### Task 43: API entrypoint

- [ ] Files and deliverable: Update api/index.php to use BackendApplication while preserving CORS, transport, request ID, timing, logging, error, and response behavior. Run php -l, router, security, transport, and aggregate tests. Commit: refactor: cut over API entrypoint.

- [ ] Commit exactly this task with the stated commit message.

### Task 44: PHP suite imports

- [ ] Files and deliverable: Update every backend test/script import to App\Shared and App\Modules without weakening assertions, then run php backend/tests/run_all.php. Commit: test: update PHP suite for module namespaces.

- [ ] Commit exactly this task with the stated commit message.

### Task 45: PHP 8.5 deployment

- [ ] Files and deliverable: Change Dockerfile to php:8.5-apache, Composer PHP requirement to ^8.5, and README/deployment references while preserving Apache/pdo_mysql/rewrite behavior. Run PHP syntax and config validation. Commit: build: target backend runtime at PHP 8.5.

- [ ] Commit exactly this task with the stated commit message.

### Task 46: Legacy removal

- [ ] Files and deliverable: Delete Controllers, Services, Routing, Logging, Config, Database, Http, Security, and Support directories after migration. Require zero legacy imports with rg, run architecture/syntax checks, and commit: refactor: remove legacy flat backend namespaces.

- [ ] Commit exactly this task with the stated commit message.

### Task 47: Architecture enforcement

- [ ] Files and deliverable: Extend architecture tests to require module public surfaces, reject cross-module Infrastructure imports, and reject RoutineGateway imports from application/presentation. Run architecture tests. Commit: test: enforce module public surfaces.

- [ ] Commit exactly this task with the stated commit message.

### Task 48: Route parity

- [ ] Files and deliverable: Create RouteContractParityTest.php comparing final routes to the baseline for path/method/auth/roles/order and add representative response checks per module. Run parity and aggregate tests. Commit: test: verify endpoint behavior parity.

- [ ] Commit exactly this task with the stated commit message.

### Task 49: Documentation

- [ ] Files and deliverable: Update backend/README.md and README.md and create docs/architecture/backend-modular-monolith.md covering PHP 8.5, boundaries, composition root, tests, Docker, and no facades. Run diff/link checks. Commit: docs: document backend modular monolith.

- [ ] Commit exactly this task with the stated commit message.

### Task 50: Final gate

- [ ] Files and deliverable: Run php -v, aggregate and standalone PHP tests, php -l over all backend PHP, architecture/parity tests, and git diff --check. Record exit codes and unavailable DB/container checks in docs/backend-modular-monolith-verification.md. Commit only after fresh verification: test: verify backend modular monolith refactor.

- [ ] Commit exactly this task with the stated commit message.

## Handoff

Execute tasks in order using TDD and fresh verification. Use superpowers:subagent-driven-development or superpowers:executing-plans for task execution. Do not claim completion without fresh command output.
