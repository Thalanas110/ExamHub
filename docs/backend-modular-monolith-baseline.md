# Backend Modular Monolith Baseline

Captured on 2026-09-24 with PHP 8.5.10 in the isolated `backend-modular-monolith` worktree.

## Runtime

- PHP: 8.5.10 CLI
- Backend: vanilla PHP with Composer PSR-4 autoloading
- Current Composer requirement: PHP `^8.0`
- Current Docker image: `php:8.3-apache`
- Database access: PDO MySQL/MariaDB and stored routines
- Entry point: `api/index.php`

## Current source layout

- `backend/src/Bootstrap`
- `backend/src/Config`
- `backend/src/Controllers`
- `backend/src/Database`
- `backend/src/Http`
- `backend/src/Logging`
- `backend/src/Routing`
- `backend/src/Security`
- `backend/src/Services`
- `backend/src/Support`

## Route groups

Auth: `/auth/register`, `/auth/login`, `/auth/logout`

Users: `/users/profile`, `/users`, `/users/:id`

Classes: `/classes`, `/classes/join`, `/classes/:id/leave`, `/classes/:id/enroll`, `/classes/:id/students/:studentId`

Exams: `/exams`, `/exams/:id`, `/exams/:id/accommodations`, `/exams/:id/accommodations/:studentId`

Results: `/results/start`, `/results/submit`, `/results/student/:id`, `/results/:id/grade`

Reports/admin: `/reports/exam-performance`, `/reports/pass-fail`, `/admin/exams`, `/admin/results`

Violations: `/exams/:examId/violations`, `/exams/:examId/violations/:studentId`, `/exams/:examId/violation-cases`, `/exams/:examId/violation-cases/:studentId`

Data/docs/health: `/data/all`, `/data/reseed`, `/docs/verify`, `/health`

## Existing test commands

- `composer smoke-test`
- `composer exam-validation-test`
- `composer encryption-storage-test`
- `composer transport-encryption-test`
- Direct PHP test scripts under `backend/tests/`

## Baseline verification

- All backend PHP files pass `php -l` under PHP 8.5.10.
- Security, CORS, encryption-storage, exam-validation, question-analytics, SQL-script-runner, and transport tests pass without a database.
- Database-backed tests cannot start because no `backend/.env` or `DB_HOST` is available in this worktree. This is an environment prerequisite, not a refactor result.
- `RequestInvalidJsonTest.php` currently fails its malformed JSON assertion before refactoring.
- `MysqlPdoFactoryTest.php` passes but emits the PHP 8.5 deprecation for `PDO::MYSQL_ATTR_USE_BUFFERED_QUERY`; the PHP 8.5-safe constant will be addressed during the refactor.
