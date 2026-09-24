<?php

declare(strict_types=1);

namespace App\Modules\Reports\Application;

final class QuestionAnalyticsBuilder
{
    /**
     * @param array<string, mixed> $authUser
     * @param array<int, array<string, mixed>> $exams
     * @param array<int, array<string, mixed>> $classes
     * @param array<int, array<string, mixed>> $submissions
     * @param array<int, array<string, mixed>> $questionMetrics
     * @return array<string, mixed>
     */
    public function build(
        array $authUser,
        array $exams,
        array $classes,
        array $submissions,
        array $questionMetrics,
    ): array {
        $scopedExams = array_values(array_filter($exams, function (array $exam) use ($authUser): bool {
            if (($authUser['role'] ?? '') === 'admin') {
                return true;
            }

            if (($authUser['role'] ?? '') === 'teacher') {
                return (string) ($exam['teacherId'] ?? '') === (string) ($authUser['id'] ?? '');
            }

            return false;
        }));

        $examMap = [];
        $questionStats = [];
        $totalQuestions = 0;
        $topicTaggedQuestions = 0;
        foreach ($scopedExams as $exam) {
            $examId = (string) ($exam['id'] ?? '');
            if ($examId === '') {
                continue;
            }

            $examMap[$examId] = $exam;
            $questions = is_array($exam['questions'] ?? null) ? $exam['questions'] : [];
            foreach ($questions as $question) {
                if (!is_array($question)) {
                    continue;
                }

                $questionId = (string) ($question['id'] ?? '');
                if ($questionId === '') {
                    continue;
                }

                $totalQuestions++;
                $topic = $this->normalizeTopic($question['topic'] ?? null);
                if ($topic !== null) {
                    $topicTaggedQuestions++;
                }

                $questionStats[$this->questionKey($examId, $questionId)] = [
                    'examId' => $examId,
                    'examTitle' => (string) ($exam['title'] ?? 'Untitled Exam'),
                    'classId' => (string) ($exam['classId'] ?? ''),
                    'questionId' => $questionId,
                    'questionText' => (string) ($question['text'] ?? ''),
                    'questionType' => (string) ($question['type'] ?? 'mcq'),
                    'topic' => $topic,
                    'marks' => (float) ($question['marks'] ?? 0),
                    'correctAnswer' => (string) ($question['correctAnswer'] ?? ''),
                    'answerCount' => 0,
                    'gradedCount' => 0,
                    'scorePctSum' => 0.0,
                    'correctCount' => 0,
                    'incorrectCount' => 0,
                    'wrongOptions' => [],
                    'timeSpentSum' => 0,
                    'telemetryCount' => 0,
                ];
            }
        }

        $classMap = [];
        foreach ($classes as $class) {
            if (!is_array($class)) {
                continue;
            }

            $classId = (string) ($class['id'] ?? '');
            if ($classId === '') {
                continue;
            }

            $classMap[$classId] = [
                'className' => (string) ($class['name'] ?? 'Unknown Class'),
                'subject' => (string) ($class['subject'] ?? ''),
            ];
        }

        $scopedSubmissions = array_values(array_filter($submissions, function (array $submission) use ($examMap): bool {
            return isset($examMap[(string) ($submission['examId'] ?? '')]);
        }));

        $metricMap = [];
        $submissionsWithTelemetry = [];
        foreach ($questionMetrics as $metric) {
            if (!is_array($metric)) {
                continue;
            }

            $submissionId = (string) ($metric['submissionId'] ?? '');
            $examId = (string) ($metric['examId'] ?? '');
            $questionId = (string) ($metric['questionId'] ?? '');
            if ($submissionId === '' || $examId === '' || $questionId === '' || !isset($examMap[$examId])) {
                continue;
            }

            $metricMap[$this->metricKey($submissionId, $questionId)] = [
                'timeSpentSeconds' => max(0, (int) ($metric['timeSpentSeconds'] ?? 0)),
                'visitCount' => max(0, (int) ($metric['visitCount'] ?? 0)),
                'answerChangeCount' => max(0, (int) ($metric['answerChangeCount'] ?? 0)),
                'topic' => $this->normalizeTopic($metric['topic'] ?? null),
            ];
            $submissionsWithTelemetry[$submissionId] = true;
        }

        foreach ($scopedSubmissions as $submission) {
            $submissionId = (string) ($submission['id'] ?? '');
            $examId = (string) ($submission['examId'] ?? '');
            $answers = is_array($submission['answers'] ?? null) ? $submission['answers'] : [];

            foreach ($answers as $answer) {
                if (!is_array($answer)) {
                    continue;
                }

                $questionId = (string) ($answer['questionId'] ?? '');
                $statKey = $this->questionKey($examId, $questionId);
                if (!isset($questionStats[$statKey])) {
                    continue;
                }

                $questionStats[$statKey]['answerCount']++;

                $marks = (float) ($questionStats[$statKey]['marks'] ?? 0);
                if (array_key_exists('marksAwarded', $answer) && $marks > 0) {
                    $awarded = (float) ($answer['marksAwarded'] ?? 0);
                    $questionStats[$statKey]['gradedCount']++;
                    $questionStats[$statKey]['scorePctSum'] += ($awarded / $marks) * 100;
                }

                $answerText = trim((string) ($answer['answer'] ?? ''));
                if (($questionStats[$statKey]['questionType'] ?? '') === 'mcq') {
                    $correctAnswer = (string) ($questionStats[$statKey]['correctAnswer'] ?? '');
                    if ($answerText !== '' && $answerText === $correctAnswer) {
                        $questionStats[$statKey]['correctCount']++;
                    } else {
                        $questionStats[$statKey]['incorrectCount']++;
                        if ($answerText !== '') {
                            $questionStats[$statKey]['wrongOptions'][$answerText] = (int) ($questionStats[$statKey]['wrongOptions'][$answerText] ?? 0) + 1;
                        }
                    }
                }

                $metricKey = $this->metricKey($submissionId, $questionId);
                if (isset($metricMap[$metricKey])) {
                    $questionStats[$statKey]['timeSpentSum'] += (int) $metricMap[$metricKey]['timeSpentSeconds'];
                    $questionStats[$statKey]['telemetryCount']++;
                }
            }
        }

        $questionAnalytics = [];
        $commonWrongAnswers = [];
        foreach ($questionStats as $stat) {
            $classId = (string) ($stat['classId'] ?? '');
            $className = (string) ($classMap[$classId]['className'] ?? 'Unknown Class');
            $gradedCount = (int) ($stat['gradedCount'] ?? 0);
            $telemetryCount = (int) ($stat['telemetryCount'] ?? 0);

            $averageScorePct = $gradedCount > 0
                ? round(((float) $stat['scorePctSum']) / $gradedCount, 1)
                : null;
            $averageTimeSpentSeconds = $telemetryCount > 0
                ? (int) round(((int) $stat['timeSpentSum']) / $telemetryCount)
                : null;

            $entry = [
                'examId' => (string) ($stat['examId'] ?? ''),
                'examTitle' => (string) ($stat['examTitle'] ?? ''),
                'classId' => $classId,
                'className' => $className,
                'questionId' => (string) ($stat['questionId'] ?? ''),
                'questionText' => (string) ($stat['questionText'] ?? ''),
                'questionType' => (string) ($stat['questionType'] ?? ''),
                'topic' => $stat['topic'],
                'attemptCount' => (int) ($stat['answerCount'] ?? 0),
                'gradedCount' => $gradedCount,
                'averageScorePct' => $averageScorePct,
                'correctRatePct' => (int) ($stat['answerCount'] ?? 0) > 0
                    ? round((((int) $stat['correctCount']) / max(1, (int) $stat['answerCount'])) * 100, 1)
                    : null,
                'averageTimeSpentSeconds' => $averageTimeSpentSeconds,
                'telemetryCount' => $telemetryCount,
            ];
            $questionAnalytics[] = $entry;

            $incorrectCount = max(1, (int) ($stat['incorrectCount'] ?? 0));
            foreach ($stat['wrongOptions'] as $option => $count) {
                $commonWrongAnswers[] = [
                    'examId' => (string) ($stat['examId'] ?? ''),
                    'examTitle' => (string) ($stat['examTitle'] ?? ''),
                    'classId' => $classId,
                    'className' => $className,
                    'questionId' => (string) ($stat['questionId'] ?? ''),
                    'questionText' => (string) ($stat['questionText'] ?? ''),
                    'topic' => $stat['topic'],
                    'option' => (string) $option,
                    'count' => (int) $count,
                    'shareOfIncorrectPct' => round(((int) $count / $incorrectCount) * 100, 1),
                ];
            }
        }

        usort($questionAnalytics, function (array $left, array $right): int {
            $leftScore = $left['averageScorePct'] ?? 101;
            $rightScore = $right['averageScorePct'] ?? 101;
            if ($leftScore !== $rightScore) {
                return $leftScore <=> $rightScore;
            }

            return ($right['attemptCount'] ?? 0) <=> ($left['attemptCount'] ?? 0);
        });
        $hardestQuestions = $questionAnalytics;

        $slowestQuestions = array_values(array_filter($questionAnalytics, static fn (array $entry): bool => $entry['averageTimeSpentSeconds'] !== null));
        usort($slowestQuestions, static function (array $left, array $right): int {
            return ($right['averageTimeSpentSeconds'] ?? 0) <=> ($left['averageTimeSpentSeconds'] ?? 0);
        });

        usort($commonWrongAnswers, static function (array $left, array $right): int {
            return ($right['count'] ?? 0) <=> ($left['count'] ?? 0);
        });

        $weakTopicIndex = [];
        foreach ($questionAnalytics as $entry) {
            $topic = $this->normalizeTopic($entry['topic'] ?? null);
            if ($topic === null || $entry['averageScorePct'] === null) {
                continue;
            }

            $topicKey = (string) ($entry['classId'] ?? '') . '::' . $topic;
            if (!isset($weakTopicIndex[$topicKey])) {
                $weakTopicIndex[$topicKey] = [
                    'classId' => (string) ($entry['classId'] ?? ''),
                    'className' => (string) ($entry['className'] ?? 'Unknown Class'),
                    'topic' => $topic,
                    'questionCount' => 0,
                    'gradedResponseCount' => 0,
                    'scorePctSum' => 0.0,
                    'telemetryCount' => 0,
                    'timeSpentSum' => 0,
                ];
            }

            $weakTopicIndex[$topicKey]['questionCount']++;
            $weakTopicIndex[$topicKey]['gradedResponseCount'] += (int) ($entry['gradedCount'] ?? 0);
            $weakTopicIndex[$topicKey]['scorePctSum'] += ((float) ($entry['averageScorePct'] ?? 0)) * (int) ($entry['gradedCount'] ?? 0);
            $weakTopicIndex[$topicKey]['telemetryCount'] += (int) ($entry['telemetryCount'] ?? 0);
            $weakTopicIndex[$topicKey]['timeSpentSum'] += ((int) ($entry['averageTimeSpentSeconds'] ?? 0)) * (int) ($entry['telemetryCount'] ?? 0);
        }

        $weakTopicsByClass = [];
        foreach ($weakTopicIndex as $topicStat) {
            $gradedResponseCount = max(1, (int) ($topicStat['gradedResponseCount'] ?? 0));
            $telemetryCount = (int) ($topicStat['telemetryCount'] ?? 0);

            $weakTopicsByClass[] = [
                'classId' => (string) ($topicStat['classId'] ?? ''),
                'className' => (string) ($topicStat['className'] ?? 'Unknown Class'),
                'topic' => (string) ($topicStat['topic'] ?? ''),
                'questionCount' => (int) ($topicStat['questionCount'] ?? 0),
                'gradedResponseCount' => (int) ($topicStat['gradedResponseCount'] ?? 0),
                'averageScorePct' => round(((float) ($topicStat['scorePctSum'] ?? 0)) / $gradedResponseCount, 1),
                'averageTimeSpentSeconds' => $telemetryCount > 0
                    ? (int) round(((int) ($topicStat['timeSpentSum'] ?? 0)) / $telemetryCount)
                    : null,
                'telemetryCount' => $telemetryCount,
            ];
        }
        usort($weakTopicsByClass, static function (array $left, array $right): int {
            return ($left['averageScorePct'] ?? 101) <=> ($right['averageScorePct'] ?? 101);
        });

        return [
            'generatedAt' => gmdate('c'),
            'coverage' => [
                'totalSubmissions' => count($scopedSubmissions),
                'telemetryEnabledSubmissions' => count($submissionsWithTelemetry),
                'totalQuestions' => $totalQuestions,
                'topicTaggedQuestions' => $topicTaggedQuestions,
            ],
            'questions' => $questionAnalytics,
            'hardestQuestions' => $hardestQuestions,
            'slowestQuestions' => $slowestQuestions,
            'commonWrongAnswers' => $commonWrongAnswers,
            'weakTopicsByClass' => $weakTopicsByClass,
        ];
    }

    private function questionKey(string $examId, string $questionId): string
    {
        return $examId . '::' . $questionId;
    }

    private function metricKey(string $submissionId, string $questionId): string
    {
        return $submissionId . '::' . $questionId;
    }

    /**
     * @param mixed $value
     */
    private function normalizeTopic(mixed $value): ?string
    {
        $topic = trim((string) $value);
        return $topic === '' ? null : $topic;
    }
}
