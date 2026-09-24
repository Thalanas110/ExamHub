<?php

declare(strict_types=1);

namespace App\Services\Support;

use App\Shared\Support\Helpers;

final class ValueNormalizer
{
    public function normalizeDate(string $value, bool $withTime): string
    {
        $timestamp = strtotime($value);
        if ($timestamp === false) {
            $timestamp = time();
        }

        return $withTime
            ? gmdate('Y-m-d H:i:s', $timestamp)
            : gmdate('Y-m-d', $timestamp);
    }

    /**
     * @param mixed $value
     */
    public function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $string = trim((string) $value);
        return $string === '' ? null : $string;
    }

    /**
     * @param mixed $questions
     * @return array<int, array<string, mixed>>
     */
    public function normalizeQuestions(mixed $questions): array
    {
        if (!is_array($questions)) {
            return [];
        }

        $result = [];
        foreach ($questions as $question) {
            if (!is_array($question)) {
                continue;
            }

            $questionId = trim((string) ($question['id'] ?? Helpers::uuidV4()));
            if ($questionId === '') {
                $questionId = Helpers::uuidV4();
            }

            $type = (string) ($question['type'] ?? 'mcq');
            if (!in_array($type, ['mcq', 'short_answer', 'essay'], true)) {
                $type = 'mcq';
            }

            $entry = [
                'id' => $questionId,
                'text' => trim((string) ($question['text'] ?? '')),
                'type' => $type,
                'marks' => (int) ($question['marks'] ?? 0),
            ];

            $topic = trim((string) ($question['topic'] ?? ''));
            if ($topic !== '') {
                $entry['topic'] = $topic;
            }

            if (isset($question['options']) && is_array($question['options'])) {
                $entry['options'] = array_values(
                    array_map(static fn (mixed $value): string => (string) $value, $question['options']),
                );
            }

            if (array_key_exists('correctAnswer', $question)) {
                $entry['correctAnswer'] = (string) $question['correctAnswer'];
            }

            $result[] = $entry;
        }

        return $result;
    }
}
