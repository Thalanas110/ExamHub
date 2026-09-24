import { request } from '@/shared/api/request';

export type ViolationType = 'tab_switch' | 'window_blur' | 'right_click' | 'auto_submitted' | 'fullscreen_exit' | 'multiple_monitors' | 'screen_overlay';

export interface ViolationRecord {
  id: number;
  exam_id: string;
  student_id: string;
  violation_no: number;
  violation_type: ViolationType;
  details: string | null;
  occurred_at: string;
}

export const violationApi = {
  report: (examId: string, type: ViolationType, details?: string) =>
    request<ViolationRecord>('POST', `/exams/${examId}/violations`, { type, details }, true),

  listByExam: (examId: string) =>
    request<ViolationRecord[]>('GET', `/exams/${examId}/violations`, undefined, true),
};

export type ViolationCaseSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ViolationCaseOutcome = 'pending' | 'dismissed' | 'warned' | 'score_penalized' | 'invalidated';

export interface ViolationCase {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  severity: ViolationCaseSeverity;
  outcome: ViolationCaseOutcome;
  teacherNotes: string | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ViolationCasePayload {
  id?: string;
  severity: ViolationCaseSeverity;
  outcome: ViolationCaseOutcome;
  notes?: string;
}

export const violationCaseApi = {
  listByExam: (examId: string) =>
    request<ViolationCase[]>('GET', `/exams/${examId}/violation-cases`, undefined, true),

  upsert: (examId: string, studentId: string, payload: ViolationCasePayload) =>
    request<ViolationCase>('PUT', `/exams/${examId}/violation-cases/${studentId}`, payload, true),
};
