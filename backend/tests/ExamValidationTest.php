<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Modules\Exams\Application\ExamPayloadValidator;
use App\Shared\Support\ApiException;

$validator = new ExamPayloadValidator();
$failures = [];

$validPayload = [
    'title' => 'Sample Exam',
    'description' => 'Sample Description',
    'classId' => 'class-1',
    'duration' => 60,
    'totalMarks' => 10,
    'passingMarks' => 5,
    'startDate' => '2026-04-16 09:00:00',
    'endDate' => '2026-04-16 10:00:00',
    'status' => 'draft',
    'questions' => [
        [
            'text' => 'What is 2 + 2?',
            'type' => 'mcq',
            'topic' => 'Arithmetic',
            'options' => ['3', '4'],
            'correctAnswer' => '4',
            'marks' => 5,
        ],
        [
            'text' => 'Explain your solution.',
            'type' => 'essay',
            'marks' => 5,
        ],
    ],
];

try {
    $validated = $validator->validateAndBuild($validPayload);
    if (($validated['questions'][0]['topic'] ?? null) !== 'Arithmetic') {
        $failures[] = 'Validated question topic should be preserved.';
    }
} catch (ApiException $exception) {
    $failures[] = 'Valid exam payload should not fail validation: ' . $exception->getMessage();
}

/**
 * @param callable(): void $callback
 */
function expectValidationFailure(callable $callback, string $expectedMessagePart, string $label, array &$failures): void
{
    try {
        $callback();
        $failures[] = sprintf('%s: expected validation failure.', $label);
    } catch (ApiException $exception) {
        if (!str_contains($exception->getMessage(), $expectedMessagePart)) {
            $failures[] = sprintf(
                '%s: expected message containing "%s" but got "%s".',
                $label,
                $expectedMessagePart,
                $exception->getMessage(),
            );
        }
    }
}

expectValidationFailure(
    static function () use ($validator, $validPayload): void {
        $payload = $validPayload;
        $payload['totalMarks'] = 100;
        $payload['questions'] = [[
            'text' => 'One question',
            'type' => 'essay',
            'marks' => 10,
        ]];
        $validator->validateAndBuild($payload);
    },
    'Not enough points in questions',
    'Under-allocation validation',
    $failures,
);

expectValidationFailure(
    static function () use ($validator, $validPayload): void {
        $payload = $validPayload;
        $payload['totalMarks'] = 10;
        $payload['questions'] = [[
            'text' => 'One question',
            'type' => 'essay',
            'marks' => 15,
        ]];
        $validator->validateAndBuild($payload);
    },
    'Question points exceed total marks',
    'Over-allocation validation',
    $failures,
);

expectValidationFailure(
    static function () use ($validator, $validPayload): void {
        $payload = $validPayload;
        $payload['passingMarks'] = 11;
        $validator->validateAndBuild($payload);
    },
    'passingMarks cannot be greater than totalMarks',
    'Passing marks validation',
    $failures,
);

expectValidationFailure(
    static function () use ($validator, $validPayload): void {
        $payload = $validPayload;
        $payload['startDate'] = '2026-04-16 11:00:00';
        $payload['endDate'] = '2026-04-16 10:00:00';
        $validator->validateAndBuild($payload);
    },
    'endDate must be later than startDate',
    'Date window validation',
    $failures,
);

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "Exam validation tests passed.\n";

