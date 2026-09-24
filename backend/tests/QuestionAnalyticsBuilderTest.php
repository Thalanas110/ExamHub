<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Modules\Reports\Application\QuestionAnalyticsBuilder;

$builder = new QuestionAnalyticsBuilder();
$failures = [];

$report = $builder->build(
    authUser: ['id' => 'teacher-1', 'role' => 'teacher'],
    exams: [
        [
            'id' => 'exam-1',
            'title' => 'Algebra Quiz',
            'classId' => 'class-1',
            'teacherId' => 'teacher-1',
            'questions' => [
                [
                    'id' => 'q-1',
                    'text' => '2 + 2 = ?',
                    'type' => 'mcq',
                    'topic' => 'Arithmetic',
                    'marks' => 5,
                    'options' => ['3', '4', '5'],
                    'correctAnswer' => '4',
                ],
                [
                    'id' => 'q-2',
                    'text' => 'Explain how to solve x + 3 = 7.',
                    'type' => 'essay',
                    'topic' => 'Linear Equations',
                    'marks' => 5,
                ],
                [
                    'id' => 'q-legacy',
                    'text' => 'Legacy question without topic',
                    'type' => 'mcq',
                    'marks' => 5,
                    'options' => ['A', 'B'],
                    'correctAnswer' => 'A',
                ],
            ],
        ],
    ],
    classes: [
        ['id' => 'class-1', 'name' => 'Mathematics 101', 'subject' => 'Math'],
    ],
    submissions: [
        [
            'id' => 'sub-1',
            'examId' => 'exam-1',
            'studentId' => 'student-1',
            'status' => 'graded',
            'answers' => [
                ['questionId' => 'q-1', 'answer' => '3', 'marksAwarded' => 0],
                ['questionId' => 'q-2', 'answer' => 'Subtract 3', 'marksAwarded' => 4],
                ['questionId' => 'q-legacy', 'answer' => 'A', 'marksAwarded' => 5],
            ],
        ],
        [
            'id' => 'sub-2',
            'examId' => 'exam-1',
            'studentId' => 'student-2',
            'status' => 'graded',
            'answers' => [
                ['questionId' => 'q-1', 'answer' => '4', 'marksAwarded' => 5],
                ['questionId' => 'q-2', 'answer' => 'Move 3', 'marksAwarded' => 2],
                ['questionId' => 'q-legacy', 'answer' => 'B', 'marksAwarded' => 0],
            ],
        ],
    ],
    questionMetrics: [
        [
            'submissionId' => 'sub-1',
            'examId' => 'exam-1',
            'studentId' => 'student-1',
            'questionId' => 'q-1',
            'topic' => 'Arithmetic',
            'timeSpentSeconds' => 40,
            'visitCount' => 1,
            'answerChangeCount' => 1,
        ],
        [
            'submissionId' => 'sub-1',
            'examId' => 'exam-1',
            'studentId' => 'student-1',
            'questionId' => 'q-2',
            'topic' => 'Linear Equations',
            'timeSpentSeconds' => 100,
            'visitCount' => 2,
            'answerChangeCount' => 2,
        ],
        [
            'submissionId' => 'sub-2',
            'examId' => 'exam-1',
            'studentId' => 'student-2',
            'questionId' => 'q-1',
            'topic' => 'Arithmetic',
            'timeSpentSeconds' => 25,
            'visitCount' => 1,
            'answerChangeCount' => 0,
        ],
    ],
);

if (($report['coverage']['totalSubmissions'] ?? null) !== 2) {
    $failures[] = 'Coverage should include scoped submissions.';
}

if (($report['coverage']['telemetryEnabledSubmissions'] ?? null) !== 2) {
    $failures[] = 'Telemetry coverage should count submissions with question metrics.';
}

if (($report['coverage']['topicTaggedQuestions'] ?? null) !== 2) {
    $failures[] = 'Only topic-tagged questions should count toward topic coverage.';
}

$hardest = $report['hardestQuestions'][0] ?? null;
if (!is_array($hardest) || ($hardest['questionId'] ?? null) !== 'q-1') {
    $failures[] = 'Question q-1 should be the hardest question in the sample data.';
}

$commonWrong = $report['commonWrongAnswers'][0] ?? null;
if (!is_array($commonWrong) || ($commonWrong['option'] ?? null) !== '3') {
    $failures[] = 'The most common wrong MCQ answer should be option 3.';
}

$slowest = $report['slowestQuestions'][0] ?? null;
if (!is_array($slowest) || ($slowest['questionId'] ?? null) !== 'q-2') {
    $failures[] = 'Question q-2 should be the slowest question.';
}

$weakTopic = $report['weakTopicsByClass'][0] ?? null;
if (!is_array($weakTopic) || ($weakTopic['topic'] ?? null) !== 'Arithmetic') {
    $failures[] = 'Arithmetic should be the weakest topic by class in the sample data.';
}

if (($weakTopic['averageTimeSpentSeconds'] ?? null) !== 33) {
    $failures[] = 'Weak topic average time should be rounded to 33 seconds.';
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "FAIL: {$failure}\n");
    }
    exit(1);
}

echo "Question analytics builder tests passed.\n";
