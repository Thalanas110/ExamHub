<?php

declare(strict_types=1);

namespace App\Modules\Results\Domain;

final readonly class Submission
{
    /**
     * @param array<int, array<string, mixed>> $answers
     */
    public function __construct(
        public string $id,
        public string $examId,
        public string $studentId,
        public int $attemptNo,
        public array $answers,
        public ?float $totalScore,
        public ?float $percentage,
        public ?string $grade,
        public ?string $feedback,
        public ?string $startedAt,
        public ?int $allowedDurationMinutes,
        public ?string $effectiveWindowStartAt,
        public ?string $effectiveWindowEndAt,
        public ?string $submittedAt,
        public ?string $gradedAt,
        public string $status,
    ) {
    }

    /**
     * @param array<string, mixed> $attributes
     */
    public static function fromArray(array $attributes): self
    {
        return new self(
            id: (string) ($attributes['id'] ?? ''),
            examId: (string) ($attributes['examId'] ?? ''),
            studentId: (string) ($attributes['studentId'] ?? ''),
            attemptNo: (int) ($attributes['attemptNo'] ?? 1),
            answers: is_array($attributes['answers'] ?? null) ? $attributes['answers'] : [],
            totalScore: isset($attributes['totalScore']) ? (float) $attributes['totalScore'] : null,
            percentage: isset($attributes['percentage']) ? (float) $attributes['percentage'] : null,
            grade: isset($attributes['grade']) ? (string) $attributes['grade'] : null,
            feedback: isset($attributes['feedback']) ? (string) $attributes['feedback'] : null,
            startedAt: isset($attributes['startedAt']) ? (string) $attributes['startedAt'] : null,
            allowedDurationMinutes: isset($attributes['allowedDurationMinutes']) ? (int) $attributes['allowedDurationMinutes'] : null,
            effectiveWindowStartAt: isset($attributes['effectiveWindowStartAt']) ? (string) $attributes['effectiveWindowStartAt'] : null,
            effectiveWindowEndAt: isset($attributes['effectiveWindowEndAt']) ? (string) $attributes['effectiveWindowEndAt'] : null,
            submittedAt: isset($attributes['submittedAt']) ? (string) $attributes['submittedAt'] : null,
            gradedAt: isset($attributes['gradedAt']) ? (string) $attributes['gradedAt'] : null,
            status: (string) ($attributes['status'] ?? 'submitted'),
        );
    }
}
