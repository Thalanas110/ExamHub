# ExamHub

ExamHub is a containerized online examination system with:

- frontend in `frontend/`
- vanilla PHP backend API in `api/` + `backend/`
- MySQL/MariaDB schema and routines in `backend/database/`

## Local Docker

Run the full stack locally with Docker:

```bash
docker compose up --build -d
```

Local URLs:

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:8081/api/health`

The local MySQL container now initializes from:

- `backend/database/app_001_schema_routines.sql`
- `backend/database/app_002_schema_split_encrypted_storage.sql`
- `backend/database/app_003_migrate_add_question_analytics.sql`
- `backend/database/app_004_migrate_add_student_exam_accommodations.sql`
- `backend/database/app_005_migrate_enable_submission_attempts.sql`
- `backend/database/logs_001_logging_routines.sql`
- `backend/database/logs_002_migrate_add_exam_violations.sql`
- `backend/database/logs_003_migrate_add_violation_cases.sql`
- `backend/database/logs_004_migrate_fix_violation_case_procedures.sql`
- `backend/database/logs_005_admin_log_read_models.sql`

Useful commands:

```bash
# watch logs
docker compose logs -f

# stop containers
docker compose down

# stop + remove DB volume (full reset)
docker compose down -v
```

## Hosted Deployment

The recommended hosted split for this repo is:

- Frontend: Vercel
- Backend API: Render
- Backend scheduled maintenance: Render cron job
- Database: Aiven for MySQL

Deployment assets included in the repo:

- [render.yaml](render.yaml)
- [frontend/vercel.json](frontend/vercel.json)
- [backend/scripts/bootstrap_database.php](backend/scripts/bootstrap_database.php)
- [backend/scripts/purge_log_retention.php](backend/scripts/purge_log_retention.php)

Use the backend bootstrap command after configuring Render with Aiven MySQL environment variables:

```bash
cd backend
composer bootstrap-database
```

That command applies the repo SQL in the correct order, retargets the hardcoded local database names to your deployed database names, and repairs legacy encrypted records.
It now also auto-discovers and applies ordered `backend/database/app_*.sql` and `backend/database/logs_*.sql` files, so new DB work can ship as additive migrations without editing the base schema.

Full hosted setup notes live in [docs/deployment/vercel-render-aiven.md](docs/deployment/vercel-render-aiven.md).

## Docs

- Backend/security guide: [backend/README.md](backend/README.md)
- API documentation: [docs/api/backend-api-documentation.md](docs/api/backend-api-documentation.md)
- Deployment guide: [docs/deployment/vercel-render-aiven.md](docs/deployment/vercel-render-aiven.md)
