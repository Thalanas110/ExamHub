# ExamHub PHP Backend

This backend is a vanilla PHP 8.5 JSON API that matches the frontend contract and keeps AES-256-GCM encryption isolated in dedicated backend utilities.

## Compliance Summary

- Runtime: vanilla PHP 8.5 with custom routing/controllers
- API style: REST-style JSON responses with proper HTTP status codes
- Database: MySQL/MariaDB using group-designed schema + stored routines
- Authentication: custom JWT plus persisted token sessions
- Validation: request parsing and service-layer validation with structured API errors
- Password handling: `password_hash()` only, never encrypted

## AES-256-GCM Security

### Encrypted Fields

- `users.department_ciphertext`, `users.department_iv`, `users.department_tag`
- `users.phone_ciphertext`, `users.phone_iv`, `users.phone_tag`
- `users.bio_ciphertext`, `users.bio_iv`, `users.bio_tag`
- `submissions.answers_json[*].answerCiphertext`, `answerIv`, `answerTag`
- `submissions.feedback_ciphertext`, `submissions.feedback_iv`, `submissions.feedback_tag`
- `student_exam_accommodations.accessibility_preferences_ciphertext`, `student_exam_accommodations.accessibility_preferences_iv`, `student_exam_accommodations.accessibility_preferences_tag`

Legacy compatibility is still supported for:

- `users.department_enc`
- `users.phone_enc`
- `users.bio_enc`
- `submissions.feedback_enc`
- `submissions.answers_json[*].answer`

### Encryption Points

- `POST /auth/register` encrypts `department`
- `PUT /users/profile` encrypts `department`, `phone`, `bio`
- `POST /users` encrypts `department`, `phone`, `bio`
- `PUT /users/:id` encrypts `department`, `phone`, `bio`
- `POST /results/submit` encrypts each submitted answer
- `PUT /exams/:id/accommodations/:studentId` encrypts `accessibilityPreferences`
- `PUT /results/:id/grade` encrypts `feedback` and stores answer payloads in the split AES format

### Decryption Points

Decryption is centralized in `App\Services\Support\ExamMapper` before JSON is returned.

- auth/profile/user reads decrypt department, phone, and bio
- accommodation reads decrypt `accessibilityPreferences`
- student exam reads expose decrypted accommodation summaries (`attemptLimit`, schedule overrides, and preferences)
- result reads decrypt answers and feedback
- legacy combined envelopes are still readable until repaired

### Key Management

- Key source: `APP_ENCRYPTION_KEY` from `backend/.env` or the runtime environment
- Accepted formats:
  - raw 32-byte string
  - plain base64 that decodes to 32 bytes
  - `base64:<...>` that decodes to 32 bytes
  - 64-character hex string
- Invalid keys fail fast during bootstrap
- The key is loaded from configuration, not hardcoded in controllers or services

## Database Files

- App base schema and routines: `backend/database/app_001_schema_routines.sql`
- App AES split-storage add-on: `backend/database/app_002_schema_split_encrypted_storage.sql`
- App question analytics migration: `backend/database/app_003_migrate_add_question_analytics.sql`
- App student accommodations migration: `backend/database/app_004_migrate_add_student_exam_accommodations.sql`
- App submission attempts migration: `backend/database/app_005_migrate_enable_submission_attempts.sql`
- Logs schema and routines: `backend/database/logs_001_logging_routines.sql`
- Logs exam violations migration: `backend/database/logs_002_migrate_add_exam_violations.sql`
- Logs violation cases migration: `backend/database/logs_003_migrate_add_violation_cases.sql`
- Logs violation case procedure fix: `backend/database/logs_004_migrate_fix_violation_case_procedures.sql`
- Logs admin read-model routines: `backend/database/logs_005_admin_log_read_models.sql`

## Setup

### Local / XAMPP

1. Create `backend/.env` from `backend/.env.example`.
2. Run `composer install` inside `backend/`.
3. Import, in order:
   - `app_001_schema_routines.sql`
   - `app_002_schema_split_encrypted_storage.sql`
   - `app_003_migrate_add_question_analytics.sql`
   - `app_004_migrate_add_student_exam_accommodations.sql`
   - `app_005_migrate_enable_submission_attempts.sql`
   - `logs_001_logging_routines.sql`
   - `logs_002_migrate_add_exam_violations.sql`
   - `logs_003_migrate_add_violation_cases.sql`
   - `logs_004_migrate_fix_violation_case_procedures.sql`
   - `logs_005_admin_log_read_models.sql`
4. Run `composer repair-encrypted-storage`.
5. Ensure Apache rewrite is enabled and `/api/*` resolves to `api/index.php`.

### Hosted Bootstrap

After setting deployed environment variables, run:

```bash
cd backend
composer bootstrap-database
```

The bootstrap script:

- connects to your configured deployment databases
- applies the repo SQL in the correct order
- auto-discovers and applies ordered `app_*.sql` and `logs_*.sql` files
- retargets the hardcoded local database names to the deployed database names
- repairs legacy encrypted records after the split-storage schema is applied

## Vercel + Render + Aiven

Recommended deployment split:

- Vercel serves the frontend SPA
- Render runs the PHP backend from [render.yaml](../render.yaml)
- Render runs the backend log-retention cron job from [render.yaml](../render.yaml)
- Aiven provides MySQL

### Render Backend Notes

- Runtime: Docker, using `docker/backend/Dockerfile`
- Health check path: `/api/health`
- Cron job: `examhub-log-retention`, daily at `00:00 UTC`
- Database host: Aiven MySQL connection values in the `examhub-aiven-mysql` Render environment group
- Set `CORS_ALLOW_ALL=false`
- Set `CORS_ALLOWED_ORIGINS` to your Vercel site URL
- Set the required seed credential env vars on first deploy if the database is empty

### Aiven Database Notes

For Aiven, the simplest setup is:

- `DB_HOST=<your Aiven host>`
- `DB_PORT=<your Aiven port>`
- `DB_NAME=<your Aiven database, often defaultdb unless you create another>`
- `DB_USER=<your Aiven user, often avnadmin>`
- `DB_PASS=<your Aiven password>`
- `DB_SSL_MODE=verify-ca`
- `DB_SSL_CA=/etc/secrets/aiven-ca.pem`
- `LOG_DB_NAME=<same value as DB_NAME>`

Download the Aiven CA certificate from the service overview and add it to Render as a secret file at the path used by `DB_SSL_CA`.

That keeps both application tables and fail-open logging tables in the same Aiven database, which avoids needing a second hosted database name during first deployment.

### Vercel Frontend Notes

Import the repo in Vercel with `frontend/` as the project root directory.
Set `VITE_PHP_BASE_URL` in Vercel to your Render backend URL, for example:

```env
VITE_PHP_BASE_URL=https://your-render-service.onrender.com/api
```

The frontend includes [frontend/vercel.json](../frontend/vercel.json) for:

- Vite build command
- `dist/client` output directory
- SPA route rewrites to `_shell.html`

## CORS

Environment variables:

- `CORS_ALLOW_ALL=true` for local development
- `CORS_ALLOW_ALL=false` in hosted environments
- `CORS_ALLOWED_ORIGINS=https://your-site.vercel.app,https://www.example.com`

When `CORS_ALLOW_ALL=false`, requests from unlisted origins are rejected.

## Seed Accounts

Seed credentials are loaded only from environment variables:

- `SEED_ADMIN_*`
- `SEED_TEACHER_*`
- `SEED_STUDENT_*`

If the database is empty and these credentials are missing, bootstrap requests will fail until they are configured.

## Presentation Fake User Dataset (CSV)

For demo or school presentation datasets, use the additive CSV workflow:

```bash
cd backend
composer generate-fake-users-csv
composer import-fake-users-csv
```

This creates and imports:

- 1 admin
- 700 professors (stored with role `teacher`)
- 5000 students

Files and behavior:

- CSV file: `backend/database/seeds/fake_users_5701.csv`
- Generator script: `backend/scripts/generate_fake_users_csv.php`
- Import script: `backend/scripts/import_fake_users_csv.php`
- Import uses `INSERT IGNORE` so existing seed users are not modified.

## Presentation Fake Exam + Violation Dataset (CSV)

To generate exams paired with the presentation users, plus anti-cheat violation reports:

```bash
cd backend
composer generate-fake-exam-csv
composer import-fake-exam-csv
```

Generated CSV files (in `backend/database/seeds/`):

- `fake_classes.csv`
- `fake_class_students.csv`
- `fake_exams.csv`
- `fake_exam_violations.csv`
- `fake_violation_cases.csv`

Behavior:

- Classes and exams are linked to the synthetic professor/teacher IDs from `fake_users_5701.csv`.
- Enrollments are linked to the synthetic student IDs from `fake_users_5701.csv`.
- Violation events and violation cases are linked to those generated exams and students.
- Main DB imports use `INSERT IGNORE`; log DB imports are duplicate-safe; existing seed data is preserved.

## Main Endpoints

- Auth: `/auth/register`, `/auth/login`, `/auth/logout`
- Users: `/users/profile`, `/users`, `/users/:id`
- Exams: `/exams`, `/exams/:id`
- Exam accommodations: `/exams/:id/accommodations`, `/exams/:id/accommodations/:studentId`
- Results: `/results/start`, `/results/submit`, `/results/student/:id`, `/results/:id/grade`
- Admin: `/admin/exams`, `/admin/results`
- Reports: `/reports/exam-performance`, `/reports/pass-fail`
- Classes: `/classes`, `/classes/join`, `/classes/:id/leave`, `/classes/:id/enroll`, `/classes/:id/students/:studentId`
- Data: `/data/all`, `/data/reseed`
- Docs: `/docs/verify`
- Health: `/health`

## Student Accommodations and Attempts

- Accommodations are stored per `student + exam`.
- Teacher/admin can set:
  - `extraTimeMinutes`
  - `alternateStartAt`
  - `alternateEndAt`
  - `attemptLimit`
  - `accessibilityPreferences`
- Student exam reads now include:
  - `attemptLimit`
  - `attemptsUsed`
  - `extraTimeMinutes`
  - `effectiveStartDate`
  - `effectiveEndDate`
  - `accessibilityPreferences`
- Submission reads now include:
  - `attemptNo`
  - `startedAt`
  - `allowedDurationMinutes`
  - `effectiveWindowStartAt`
  - `effectiveWindowEndAt`
- `POST /results/start` creates a trusted in-progress attempt.
- `POST /results/submit` supports:
  - explicit submit by `submissionId`
  - legacy compatibility submit by `examId`, which auto-starts and submits a new attempt
- Timing enforcement:
  - attempts must start inside the effective schedule window
  - attempts expire if submitted after the effective schedule or after `startedAt + allowedDurationMinutes`
  - attempt limits are enforced at start time

## Frontend Connection

Local example:

```env
VITE_PHP_BASE_URL=http://localhost/group8/api
# or, Laragon virtual-host mode:
# VITE_PHP_BASE_URL=http://group8.test/api
```

Hosted example:

```env
VITE_PHP_BASE_URL=https://your-render-service.onrender.com/api
```
