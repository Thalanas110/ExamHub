<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Modules\Classes\Application\ClassMapper;
use App\Modules\Classes\Domain\Classroom;
use App\Modules\Classes\Domain\ClassRepository;
use App\Services\Support\ValueNormalizer;

$class = Classroom::fromArray([
    'id' => 'class-1',
    'name' => 'Physics',
    'subject' => 'Science',
    'teacherId' => 'teacher-1',
    'studentIds' => ['student-1'],
    'code' => 'PHY101',
    'createdAt' => '2026-09-24',
    'description' => 'Introductory course',
]);

if ($class->toArray()['code'] !== 'PHY101' || $class->studentIds !== ['student-1']) {
    throw new RuntimeException('Classroom should preserve class attributes.');
}

$mapped = new ClassMapper(new ValueNormalizer())->mapRow([
    'id' => 'class-1',
    'studentIds' => '["student-1", "", 2]',
    'description' => '  ',
]);

if ($mapped['studentIds'] !== ['student-1', '2'] || $mapped['description'] !== null) {
    throw new RuntimeException('ClassMapper should normalize class rows.');
}

if (!interface_exists(ClassRepository::class)) {
    throw new RuntimeException('ClassRepository should be defined.');
}

fwrite(STDOUT, "Class domain tests passed.\n");
