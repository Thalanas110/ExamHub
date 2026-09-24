<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Modules\Results\Application\ResultMapper;
use App\Modules\Results\Domain\Submission;
use App\Shared\Security\AesGcmCrypto;
use App\Shared\Support\ValueNormalizer;

$submission = Submission::fromArray([
    'id' => 'submission-1',
    'examId' => 'exam-1',
    'studentId' => 'student-1',
    'answers' => [],
    'status' => 'graded',
]);

if ($submission->id !== 'submission-1' || $submission->status !== 'graded') {
    throw new RuntimeException('Submission should preserve result attributes.');
}

$mapped = new ResultMapper(
    new AesGcmCrypto('0123456789abcdef0123456789abcdef'),
    new ValueNormalizer(),
)->mapSubmissionRow(['id' => 'submission-1', 'answers' => '[]']);

if ($mapped['id'] !== 'submission-1' || $mapped['answers'] !== []) {
    throw new RuntimeException('ResultMapper should normalize submission rows.');
}

fwrite(STDOUT, "Results domain tests passed.\n");
