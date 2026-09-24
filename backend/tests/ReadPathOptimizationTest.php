<?php

declare(strict_types=1);

$projectRoot = dirname(__DIR__, 2);
$migrationPath = $projectRoot . '/backend/database/app_007_migrate_optimize_read_paths.sql';
$dataServicePath = $projectRoot . '/backend/src/Modules/Data/Application/DataService.php';
$composePath = $projectRoot . '/docker-compose.yml';

$migration = file_get_contents($migrationPath);
$dataService = file_get_contents($dataServicePath);
$compose = file_get_contents($composePath);

if (!is_string($migration) || !is_string($dataService) || !is_string($compose)) {
    throw new RuntimeException('Read-path optimization files should be readable.');
}

require_once $projectRoot . '/backend/bootstrap/autoload.php';
$statements = App\Shared\Database\SqlScriptRunner::splitStatements($migration);
$procedureStatements = array_filter(
    $statements,
    static fn (string $statement): bool => str_contains(strtoupper($statement), 'CREATE PROCEDURE'),
);
if (count($procedureStatements) !== 3) {
    throw new RuntimeException('The optimization migration should split into three executable procedure statements.');
}

$requiredIndexes = [
    'idx_users_created_at_id',
    'idx_users_role_id',
    'idx_classes_created_ts_id',
    'idx_classes_teacher_created_ts',
    'idx_class_students_student_class',
    'idx_class_students_class_joined_student',
    'idx_exams_created_ts_id',
    'idx_exams_teacher_created_ts',
    'idx_exams_class_created_ts',
    'idx_submissions_started_attempt',
    'idx_submissions_student_started_attempt',
    'idx_submissions_exam_status_started',
    'idx_submission_question_metrics_created',
    'idx_submission_question_metrics_exam_created',
];

foreach ($requiredIndexes as $indexName) {
    if (!str_contains($migration, "'{$indexName}'")) {
        throw new RuntimeException(sprintf('Expected performance index is missing: %s', $indexName));
    }
}

foreach (['sp_data_for_user', 'sp_submission_question_metrics_get_for_user', 'p_role', 'p_user_id', "p_role = 'admin'", "p_role = 'teacher'"] as $requiredFragment) {
    if (!str_contains($migration, $requiredFragment)) {
        throw new RuntimeException(sprintf('Expected scoped read-path fragment is missing: %s', $requiredFragment));
    }
}

if (str_contains($migration, 'JSON_ARRAYAGG') || !str_contains($migration, 'SET SESSION group_concat_max_len')) {
    throw new RuntimeException('The optimized data read path must use the MariaDB-compatible bounded JSON aggregation.');
}

if (!str_contains($dataService, "callMultiMapped(") || !str_contains($dataService, "'sp_data_for_user'")) {
    throw new RuntimeException('DataService must call the scoped data routine.');
}

if (str_contains($dataService, "callMulti('sp_data_all'")) {
    throw new RuntimeException('DataService must not load the unscoped data routine.');
}

$reportServicePath = $projectRoot . '/backend/src/Modules/Reports/Application/ReportService.php';
$reportService = file_get_contents($reportServicePath);
if (!is_string($reportService) || !str_contains($reportService, "sp_submission_question_metrics_get_for_user")) {
    throw new RuntimeException('ReportService must call the scoped telemetry routine.');
}

$app006Position = strpos($compose, '06-app_006_migrate_fix_class_student_json_aggregation.sql');
$app007Position = strpos($compose, '07-app_007_migrate_optimize_read_paths.sql');
$logsPosition = strpos($compose, '08-logs_001_logging_routines.sql');
if ($app006Position === false || $app007Position === false || $logsPosition === false
    || $app006Position >= $app007Position || $app007Position >= $logsPosition) {
    throw new RuntimeException('Docker database migrations must remain ordered: app_006, app_007, then logs.');
}

fwrite(STDOUT, "Read-path optimization contract passed.\n");
