<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/autoload.php';

use App\Shared\Http\Response;

$payload = [
    'users' => [['id' => 'user-1', 'name' => 'Seed User']],
    'exams' => [['id' => 'exam-1', 'questions' => [['id' => 'question-1']]]],
    'classes' => [['id' => 'class-1', 'studentIds' => ['user-1']]],
    'submissions' => [['id' => 'submission-1', 'answers' => [['questionId' => 'question-1']]]],
];

ob_start();
Response::json($payload);
$encoded = ob_get_clean();

if (!is_string($encoded)) {
    fwrite(STDERR, "FAIL: Streaming response did not produce output.\n");
    exit(1);
}

$decoded = json_decode($encoded, true);
if ($decoded !== $payload) {
    fwrite(STDERR, "FAIL: Streaming response changed the aggregate JSON payload.\n");
    exit(1);
}

echo "Response JSON streaming test passed.\n";
