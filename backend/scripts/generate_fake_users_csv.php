<?php

declare(strict_types=1);

const DEFAULT_OUTPUT_PATH = __DIR__ . '/../database/seeds/fake_users_5701.csv';
const DEFAULT_STUDENT_COUNT = 5000;
const DEFAULT_TEACHER_COUNT = 700;
const DEFAULT_ADMIN_NAME = 'Presentation Admin';
const DEFAULT_ADMIN_EMAIL = 'presentation-admin@demo-school.invalid';
const DEFAULT_ADMIN_PASSWORD = 'DemoOnly#Admin2026';
const DEFAULT_ADMIN_DEPARTMENT = 'Academic Affairs';
const DEFAULT_TEACHER_PASSWORD = 'DemoOnly#Teacher2026';
const DEFAULT_STUDENT_PASSWORD = 'DemoOnly#Student2026';

/** @var array<int, string> */
const FIRST_NAMES = [
    'Alex',
    'Jordan',
    'Taylor',
    'Morgan',
    'Casey',
    'Avery',
    'Parker',
    'Riley',
    'Quinn',
    'Skyler',
    'Cameron',
    'Dakota',
    'Emerson',
    'Finley',
    'Harper',
    'Hayden',
    'Jamie',
    'Kendall',
    'Logan',
    'Rowan',
];

/** @var array<int, string> */
const LAST_NAMES = [
    'Anderson',
    'Bennett',
    'Campbell',
    'Dawson',
    'Ellis',
    'Foster',
    'Griffin',
    'Hayes',
    'Ingram',
    'Jensen',
    'Keller',
    'Lawson',
    'Murray',
    'Norris',
    'Owens',
    'Prescott',
    'Quincy',
    'Ramsey',
    'Sawyer',
    'Turner',
];

/** @var array<int, string> */
const TEACHER_DEPARTMENTS = [
    'Computer Science',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Economics',
    'Literature',
    'History',
    'Business',
    'Engineering',
];

/** @var array<int, string> */
const STUDENT_DEPARTMENTS = [
    'Computer Science',
    'Information Technology',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Accounting',
    'Marketing',
    'Psychology',
    'Civil Engineering',
    'Mechanical Engineering',
    'Political Science',
];

main($argv);

/**
 * @param array<int, string> $argv
 */
function main(array $argv): void
{
    $options = parseOptions($argv);

    if (array_key_exists('help', $options)) {
        printUsage();
        exit(0);
    }

    $outputPath = resolveOutputPath((string) ($options['output'] ?? DEFAULT_OUTPUT_PATH));
    $studentCount = parseCountOption($options, 'students', DEFAULT_STUDENT_COUNT);
    $teacherCount = parseCountOption($options, 'teachers', DEFAULT_TEACHER_COUNT);
    $adminName = trim((string) ($options['admin-name'] ?? DEFAULT_ADMIN_NAME));
    $adminEmail = strtolower(trim((string) ($options['admin-email'] ?? DEFAULT_ADMIN_EMAIL)));
    $adminPassword = (string) ($options['admin-password'] ?? DEFAULT_ADMIN_PASSWORD);

    if ($adminName === '') {
        throw new RuntimeException('admin-name must not be empty.');
    }

    if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('admin-email must be a valid email address.');
    }

    if ($adminPassword === '') {
        throw new RuntimeException('admin-password must not be empty.');
    }

    $directory = dirname($outputPath);
    if (!is_dir($directory) && !mkdir($directory, 0777, true) && !is_dir($directory)) {
        throw new RuntimeException('Failed to create directory: ' . $directory);
    }

    $handle = fopen($outputPath, 'wb');
    if ($handle === false) {
        throw new RuntimeException('Failed to open CSV output: ' . $outputPath);
    }

    $header = ['id', 'name', 'email', 'role', 'password', 'department', 'phone', 'bio', 'joined_at'];
    fputcsv($handle, $header, ',', '"', '\\');

    $rowCount = 0;

    $adminRow = [
        deterministicUuid('admin-1'),
        $adminName,
        $adminEmail,
        'admin',
        $adminPassword,
        DEFAULT_ADMIN_DEPARTMENT,
        demoPhoneNumber(1),
        'Presentation-only administrator account.',
        deterministicJoinDate(1),
    ];
    fputcsv($handle, $adminRow, ',', '"', '\\');
    $rowCount++;

    for ($index = 1; $index <= $teacherCount; $index++) {
        $email = sprintf('professor%04d@demo-school.invalid', $index);
        $department = TEACHER_DEPARTMENTS[$index % count(TEACHER_DEPARTMENTS)];
        $row = [
            deterministicUuid('teacher-' . $index),
            buildName($index, 'Prof.'),
            $email,
            'teacher',
            DEFAULT_TEACHER_PASSWORD,
            $department,
            demoPhoneNumber($index + 1000),
            'Synthetic professor profile for presentation demos.',
            deterministicJoinDate($index + 1000),
        ];
        fputcsv($handle, $row, ',', '"', '\\');
        $rowCount++;
    }

    for ($index = 1; $index <= $studentCount; $index++) {
        $email = sprintf('student%05d@demo-school.invalid', $index);
        $department = STUDENT_DEPARTMENTS[$index % count(STUDENT_DEPARTMENTS)];
        $row = [
            deterministicUuid('student-' . $index),
            buildName($index, ''),
            $email,
            'student',
            DEFAULT_STUDENT_PASSWORD,
            $department,
            demoPhoneNumber($index + 5000),
            'Synthetic student profile for presentation demos.',
            deterministicJoinDate($index + 5000),
        ];
        fputcsv($handle, $row, ',', '"', '\\');
        $rowCount++;
    }

    fclose($handle);

    fwrite(STDOUT, "Fake user CSV generated.\n");
    fwrite(STDOUT, "Output: {$outputPath}\n");
    fwrite(STDOUT, "Rows written (excluding header): {$rowCount}\n");
    fwrite(STDOUT, sprintf("Composition: 1 admin, %d professors(teacher role), %d students\n", $teacherCount, $studentCount));
}

/**
 * @param array<string, string> $options
 */
function parseCountOption(array $options, string $key, int $default): int
{
    $raw = (string) ($options[$key] ?? (string) $default);
    if (!preg_match('/^[0-9]+$/', $raw)) {
        throw new RuntimeException(sprintf('%s must be an integer.', $key));
    }

    $value = (int) $raw;
    if ($value < 0) {
        throw new RuntimeException(sprintf('%s must be >= 0.', $key));
    }

    return $value;
}

/**
 * @param array<int, string> $argv
 * @return array<string, string>
 */
function parseOptions(array $argv): array
{
    $options = [];
    $count = count($argv);

    for ($index = 1; $index < $count; $index++) {
        $argument = $argv[$index];
        if (!str_starts_with($argument, '--')) {
            continue;
        }

        $argument = substr($argument, 2);
        if ($argument === '') {
            continue;
        }

        if (str_contains($argument, '=')) {
            [$key, $value] = explode('=', $argument, 2);
            $options[$key] = $value;
            continue;
        }

        $next = $argv[$index + 1] ?? '';
        if ($next !== '' && !str_starts_with($next, '--')) {
            $options[$argument] = $next;
            $index++;
            continue;
        }

        $options[$argument] = '1';
    }

    return $options;
}

function resolveOutputPath(string $outputPath): string
{
    $trimmed = trim($outputPath);
    if ($trimmed === '') {
        return DEFAULT_OUTPUT_PATH;
    }

    if (preg_match('/^[A-Za-z]:\\\\/', $trimmed) === 1) {
        return $trimmed;
    }

    if (str_starts_with($trimmed, '/') || str_starts_with($trimmed, '\\')) {
        return $trimmed;
    }

    return realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $trimmed);
}

function deterministicUuid(string $seed): string
{
    $hash = hash('sha256', $seed);
    $timeLow = substr($hash, 0, 8);
    $timeMid = substr($hash, 8, 4);
    $timeHi = dechex((hexdec(substr($hash, 12, 4)) & 0x0fff) | 0x4000);
    $clockSeq = dechex((hexdec(substr($hash, 16, 4)) & 0x3fff) | 0x8000);
    $node = substr($hash, 20, 12);

    return sprintf(
        '%s-%s-%s-%s-%s',
        strtolower($timeLow),
        strtolower($timeMid),
        strtolower(str_pad($timeHi, 4, '0', STR_PAD_LEFT)),
        strtolower(str_pad($clockSeq, 4, '0', STR_PAD_LEFT)),
        strtolower($node),
    );
}

function buildName(int $index, string $prefix): string
{
    $first = FIRST_NAMES[$index % count(FIRST_NAMES)];
    $last = LAST_NAMES[($index * 7) % count(LAST_NAMES)];
    $name = $first . ' ' . $last;

    if ($prefix === '') {
        return $name;
    }

    return $prefix . ' ' . $name;
}

function demoPhoneNumber(int $index): string
{
    return sprintf('+1-555-%03d-%04d', ($index % 1000), (($index * 37) % 10000));
}

function deterministicJoinDate(int $index): string
{
    $startTimestamp = strtotime('2019-01-01');
    $offsetDays = ($index * 17) % 2555;
    return date('Y-m-d', $startTimestamp + ($offsetDays * 86400));
}

function printUsage(): void
{
    $usage = <<<TXT
Usage:
  php scripts/generate_fake_users_csv.php [--output PATH] [--students N] [--teachers N] [--admin-name NAME] [--admin-email EMAIL] [--admin-password PASSWORD]

Defaults:
  --output backend/database/seeds/fake_users_5701.csv
  --students 5000
  --teachers 700
  --admin-name "Presentation Admin"
  --admin-email "presentation-admin@demo-school.invalid"
  --admin-password "DemoOnly#Admin2026"

TXT;
    fwrite(STDOUT, $usage);
}
