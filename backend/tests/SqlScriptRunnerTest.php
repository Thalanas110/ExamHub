<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Database\SqlScriptRunner;

$failures = [];

$sql = <<<'SQL'
CREATE DATABASE IF NOT EXISTS examhub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE examhub;

DELIMITER $$

CREATE PROCEDURE sp_test()
BEGIN
    SELECT 1;
    SELECT 2;
    SELECT u.id FROM examhub.users u;
END$$

DELIMITER ;

CREATE TABLE test_table (
    id INT NOT NULL
);
SQL;

$retargeted = SqlScriptRunner::retargetDatabase($sql, 'examhub', 'aiven_prod');
if (str_contains($retargeted, 'CREATE DATABASE IF NOT EXISTS examhub')) {
    $failures[] = 'retargetDatabase should strip CREATE DATABASE statements for hosted bootstraps.';
}

if (!str_contains($retargeted, 'USE `aiven_prod`;')) {
    $failures[] = 'retargetDatabase should rewrite USE statements to the target database.';
}

if (!str_contains($retargeted, 'FROM `aiven_prod`.users u')) {
    $failures[] = 'retargetDatabase should rewrite qualified database references to the target database.';
}

$statements = SqlScriptRunner::splitStatements($retargeted);
if (count($statements) !== 3) {
    $failures[] = sprintf('Expected 3 SQL statements after retargeting, found %d.', count($statements));
}

if (!isset($statements[1]) || !str_contains($statements[1], 'SELECT 1;') || !str_contains($statements[1], 'END')) {
    $failures[] = 'The SQL splitter should keep stored procedure bodies intact under DELIMITER blocks.';
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "SQL script runner tests passed.\n";
