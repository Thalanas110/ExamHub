import { request } from '@/shared/api/request';

export interface ExamPerformanceReport {
  examId: string;
  examTitle: string;
  classId: string;
  className: string;
  totalSubmissions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passCount: number;
  failCount: number;
}

export interface PassFailReport {
  overall: { total: number; passed: number; failed: number; passRate: number };
  byExam: { examId: string; examTitle: string; passed: number; failed: number; passRate: number }[];
  byClass: { classId: string; className: string; passed: number; failed: number; passRate: number }[];
}

export interface QuestionAnalyticsCoverage {
  totalSubmissions: number;
  telemetryEnabledSubmissions: number;
  totalQuestions: number;
  topicTaggedQuestions: number;
}

export interface QuestionAnalyticsQuestion {
  examId: string;
  examTitle: string;
  classId: string;
  className: string;
  questionId: string;
  questionText: string;
  questionType: 'mcq' | 'short_answer' | 'essay' | string;
  topic?: string | null;
  attemptCount: number;
  gradedCount: number;
  averageScorePct?: number | null;
  correctRatePct?: number | null;
  averageTimeSpentSeconds?: number | null;
  telemetryCount: number;
}

export interface CommonWrongAnswerReport {
  examId: string;
  examTitle: string;
  classId: string;
  className: string;
  questionId: string;
  questionText: string;
  topic?: string | null;
  option: string;
  count: number;
  shareOfIncorrectPct: number;
}

export interface WeakTopicByClassReport {
  classId: string;
  className: string;
  topic: string;
  questionCount: number;
  gradedResponseCount: number;
  averageScorePct: number;
  averageTimeSpentSeconds?: number | null;
  telemetryCount: number;
}

export interface QuestionAnalyticsReport {
  generatedAt: string;
  coverage: QuestionAnalyticsCoverage;
  questions: QuestionAnalyticsQuestion[];
  hardestQuestions: QuestionAnalyticsQuestion[];
  slowestQuestions: QuestionAnalyticsQuestion[];
  commonWrongAnswers: CommonWrongAnswerReport[];
  weakTopicsByClass: WeakTopicByClassReport[];
}

export const reportApi = {
  getExamPerformance: () =>
    request<ExamPerformanceReport[]>('GET', '/reports/exam-performance', undefined, true),

  getPassFail: () =>
    request<PassFailReport>('GET', '/reports/pass-fail', undefined, true),

  getQuestionAnalytics: () =>
    request<QuestionAnalyticsReport>('GET', '/reports/question-analytics', undefined, true),
};
