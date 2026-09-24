import type {
  CommonWrongAnswerReport,
  QuestionAnalyticsQuestion,
  QuestionAnalyticsReport,
  WeakTopicByClassReport,
} from '../../../../services/api';

export function getClassOptions(report: QuestionAnalyticsReport | null) {
  const index = new Map<string, string>();
  for (const question of report?.questions ?? []) {
    if (!index.has(question.classId)) {
      index.set(question.classId, question.className);
    }
  }
  return Array.from(index.entries()).map(([id, name]) => ({ id, name }));
}

export function getExamOptions(report: QuestionAnalyticsReport | null, selectedClass: string) {
  const index = new Map<string, { id: string; title: string; classId: string }>();
  for (const question of report?.questions ?? []) {
    if (selectedClass !== 'all' && question.classId !== selectedClass) continue;
    if (!index.has(question.examId)) {
      index.set(question.examId, {
        id: question.examId,
        title: question.examTitle,
        classId: question.classId,
      });
    }
  }
  return Array.from(index.values());
}

export function getTopicOptions(report: QuestionAnalyticsReport | null, selectedClass: string, selectedExam: string) {
  const topics = new Set<string>();
  for (const question of report?.questions ?? []) {
    if (selectedClass !== 'all' && question.classId !== selectedClass) continue;
    if (selectedExam !== 'all' && question.examId !== selectedExam) continue;
    if (question.topic) topics.add(question.topic);
  }
  return Array.from(topics.values()).sort((left, right) => left.localeCompare(right));
}

export function getSelectedExamClassId(report: QuestionAnalyticsReport | null, selectedExam: string) {
  if (!report || selectedExam === 'all') return null;
  return report.questions.find(question => question.examId === selectedExam)?.classId ?? null;
}

export function filterQuestions(
  report: QuestionAnalyticsReport | null,
  selectedClass: string,
  selectedExam: string,
  selectedTopic: string,
) {
  return (report?.questions ?? []).filter(question => {
    if (selectedClass !== 'all' && question.classId !== selectedClass) return false;
    if (selectedExam !== 'all' && question.examId !== selectedExam) return false;
    if (selectedTopic !== 'all' && question.topic !== selectedTopic) return false;
    return true;
  });
}

export function filterWrongAnswers(
  report: QuestionAnalyticsReport | null,
  selectedClass: string,
  selectedExam: string,
  selectedTopic: string,
) {
  return (report?.commonWrongAnswers ?? []).filter(item => {
    if (selectedClass !== 'all' && item.classId !== selectedClass) return false;
    if (selectedExam !== 'all' && item.examId !== selectedExam) return false;
    if (selectedTopic !== 'all' && item.topic !== selectedTopic) return false;
    return true;
  });
}

export function filterWeakTopics(
  report: QuestionAnalyticsReport | null,
  selectedClass: string,
  selectedExamClassId: string | null,
  selectedTopic: string,
) {
  return (report?.weakTopicsByClass ?? []).filter(item => {
    const classMatch = selectedClass !== 'all'
      ? item.classId === selectedClass
      : selectedExamClassId === null || item.classId === selectedExamClassId;

    if (!classMatch) return false;
    if (selectedTopic !== 'all' && item.topic !== selectedTopic) return false;
    return true;
  });
}

export function getHardestQuestions(questions: QuestionAnalyticsQuestion[]) {
  return [...questions]
    .filter(question => question.averageScorePct !== null && question.averageScorePct !== undefined)
    .sort((left, right) => (left.averageScorePct ?? 101) - (right.averageScorePct ?? 101))
    .slice(0, 5);
}

export function getSlowestQuestions(questions: QuestionAnalyticsQuestion[]) {
  return [...questions]
    .filter(question => question.averageTimeSpentSeconds !== null && question.averageTimeSpentSeconds !== undefined)
    .sort((left, right) => (right.averageTimeSpentSeconds ?? 0) - (left.averageTimeSpentSeconds ?? 0))
    .slice(0, 5);
}
