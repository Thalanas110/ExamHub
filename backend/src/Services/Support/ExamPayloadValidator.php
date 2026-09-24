<?php

declare(strict_types=1);

namespace App\Services\Support;

use App\Shared\Support\ApiException;
use App\Shared\Support\Helpers;

final class ExamPayloadValidator
{
    /**
     * @param array<string, mixed> $payload
     * @param array<string, mixed>|null $existing
     * @return array{
     *     title: string,
     *     description: string,
     *     classId: string,
     *     duration: int,
     *     totalMarks: int,
     *     passingMarks: int,
     *     startDate: string,
     *     endDate: string,
     *     status: string,
     *     questions: array<int, array<string, mixed>>
     * }
     */
    public function validateAndBuild(array $payload, ?array $existing = null): array
    {
        $title = $this->requireNonEmptyString(
            (string) ($payload['title'] ?? ($existing['title'] ?? '')),
            'title',
        );
        $description = $this->requireNonEmptyString(
            (string) ($payload['description'] ?? ($existing['description'] ?? '')),
            'description',
        );
        $classId = $this->requireNonEmptyString(
            (string) ($payload['classId'] ?? ($existing['classId'] ?? '')),
            'classId',
        );

        $duration = $this->requirePositiveInt($payload['duration'] ?? ($existing['duration'] ?? 0), 'duration');
        $totalMarks = $this->requirePositiveInt($payload['totalMarks'] ?? ($existing['totalMarks'] ?? 0), 'totalMarks');
        $passingMarks = $this->requirePositiveInt($payload['passingMarks'] ?? ($existing['passingMarks'] ?? 0), 'passingMarks');

        if ($passingMarks > $totalMarks) {
            throw new ApiException(422, 'passingMarks cannot be greater than totalMarks.');
        }

        $status = (string) ($payload['status'] ?? ($existing['status'] ?? 'draft'));
        if (!in_array($status, ['draft', 'published', 'completed'], true)) {
            throw new ApiException(422, 'Invalid exam status.');
        }

        $startDate = $this->normalizeDateTime(
            (string) ($payload['startDate'] ?? ($existing['startDate'] ?? '')),
            'startDate',
        );
        $endDate = $this->normalizeDateTime(
            (string) ($payload['endDate'] ?? ($existing['endDate'] ?? '')),
            'endDate',
        );

        $startTimestamp = strtotime($startDate);
        $endTimestamp = strtotime($endDate);
        if ($startTimestamp === false || $endTimestamp === false || $endTimestamp <= $startTimestamp) {
            throw new ApiException(422, 'endDate must be later than startDate.');
        }

        $rawQuestions = array_key_exists('questions', $payload)
            ? $payload['questions']
            : ($existing['questions'] ?? []);
        $questions = $this->validateQuestions($rawQuestions, $totalMarks);

        return [
            'title' => $title,
            'description' => $description,
            'classId' => $classId,
            'duration' => $duration,
            'totalMarks' => $totalMarks,
            'passingMarks' => $passingMarks,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'status' => $status,
            'questions' => $questions,
        ];
    }

    private function requireNonEmptyString(string $value, string $field): string
    {
        $normalized = trim($value);
        if ($normalized === '') {
            throw new ApiException(422, sprintf('%s is required.', $field));
        }

        return $normalized;
    }

    /**
     * @param mixed $value
     */
    private function requirePositiveInt(mixed $value, string $field): int
    {
        $number = (int) $value;
        if ($number <= 0) {
            throw new ApiException(422, sprintf('%s must be greater than zero.', $field));
        }

        return $number;
    }

    private function normalizeDateTime(string $value, string $field): string
    {
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            throw new ApiException(422, sprintf('Invalid %s. Use a valid date and time.', $field));
        }

        return gmdate('Y-m-d H:i:s', $timestamp);
    }

    /**
     * @param mixed $questions
     * @return array<int, array<string, mixed>>
     */
    private function validateQuestions(mixed $questions, int $totalMarks): array
    {
        if (!is_array($questions) || $questions === []) {
            throw new ApiException(422, 'At least one question is required.');
        }

        $validatedQuestions = [];
        $allocatedMarks = 0;

        foreach ($questions as $index => $question) {
            $position = $index + 1;
            if (!is_array($question)) {
                throw new ApiException(422, sprintf('Question %d is invalid.', $position));
            }

            $questionId = trim((string) ($question['id'] ?? Helpers::uuidV4()));
            if ($questionId === '') {
                $questionId = Helpers::uuidV4();
            }

            $type = (string) ($question['type'] ?? 'mcq');
            if (!in_array($type, ['mcq', 'short_answer', 'essay'], true)) {
                throw new ApiException(422, sprintf('Question %d has an invalid type.', $position));
            }

            $text = trim((string) ($question['text'] ?? ''));
            if ($text === '') {
                throw new ApiException(422, sprintf('Question %d text is required.', $position));
            }

            $marks = $this->requirePositiveInt($question['marks'] ?? 0, sprintf('Question %d marks', $position));

            $entry = [
                'id' => $questionId,
                'text' => $text,
                'type' => $type,
                'marks' => $marks,
            ];

            $topic = trim((string) ($question['topic'] ?? ''));
            if ($topic !== '') {
                $entry['topic'] = $topic;
            }

            if ($type === 'mcq') {
                $entry += $this->validateMcqQuestion($question, $position);
            } else if (array_key_exists('correctAnswer', $question)) {
                $entry['correctAnswer'] = trim((string) $question['correctAnswer']);
            }

            $validatedQuestions[] = $entry;
            $allocatedMarks += $marks;
        }

        if ($allocatedMarks < $totalMarks) {
            throw new ApiException(
                422,
                sprintf(
                    'Not enough points in questions. Total marks is %d but only %d point(s) are assigned.',
                    $totalMarks,
                    $allocatedMarks,
                ),
            );
        }

        if ($allocatedMarks > $totalMarks) {
            throw new ApiException(
                422,
                sprintf(
                    'Question points exceed total marks. Total marks is %d but %d point(s) are assigned.',
                    $totalMarks,
                    $allocatedMarks,
                ),
            );
        }

        return $validatedQuestions;
    }

    /**
     * @param array<string, mixed> $question
     * @return array{
     *     options: array<int, string>,
     *     correctAnswer: string
     * }
     */
    private function validateMcqQuestion(array $question, int $position): array
    {
        $rawOptions = $question['options'] ?? [];
        if (!is_array($rawOptions)) {
            throw new ApiException(422, sprintf('Question %d options must be an array.', $position));
        }

        $options = array_values(array_filter(
            array_map(static fn (mixed $option): string => trim((string) $option), $rawOptions),
            static fn (string $option): bool => $option !== '',
        ));

        if (count($options) < 2) {
            throw new ApiException(422, sprintf('Question %d must have at least 2 options.', $position));
        }

        $correctAnswer = trim((string) ($question['correctAnswer'] ?? ''));
        if ($correctAnswer === '') {
            throw new ApiException(422, sprintf('Question %d must have a correctAnswer.', $position));
        }

        if (!in_array($correctAnswer, $options, true)) {
            throw new ApiException(422, sprintf('Question %d correctAnswer must match one of the options.', $position));
        }

        return [
            'options' => $options,
            'correctAnswer' => $correctAnswer,
        ];
    }
}

