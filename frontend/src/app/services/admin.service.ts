import { request } from '@/shared/api/request';
import type { ExamResponse } from './exam.service';
import type { ResultResponse } from './result.service';
import type { ViolationCaseOutcome, ViolationCaseSeverity, ViolationType } from './violation.service';

export interface AdminRequestLog {
  id: number;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  userId: string | null;
  role: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  errorSummary: string | null;
  createdAt: string | null;
}

export interface AdminAuditLog {
  id: number;
  requestId: string;
  actionMethod: string;
  resourcePath: string;
  routePattern: string | null;
  targetId: string | null;
  outcome: 'success' | 'failure';
  statusCode: number;
  durationMs: number;
  actorUserId: string | null;
  actorRole: string | null;
  createdAt: string | null;
}

export interface AdminLogsResponse {
  requestSummary: {
    totalRequests: number;
    failedRequests: number;
    averageDurationMs: number;
    uniqueUsers: number;
    latestRequestAt: string | null;
  };
  requestLogs: AdminRequestLog[];
  auditSummary: {
    totalAuditEvents: number;
    failedAuditEvents: number;
    uniqueActors: number;
    latestAuditAt: string | null;
  };
  auditLogs: AdminAuditLog[];
}

export interface AdminViolationDashboardRow {
  examId: string;
  examTitle: string;
  className: string | null;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  violationCount: number;
  firstOccurredAt: string | null;
  lastOccurredAt: string | null;
  latestType: ViolationType | null;
  latestDetails: string | null;
  caseId: string | null;
  severity: ViolationCaseSeverity | null;
  outcome: ViolationCaseOutcome | null;
  teacherNotes: string | null;
  reviewedBy: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminViolationDashboardResponse {
  summary: {
    totalViolations: number;
    impactedStudents: number;
    autoSubmittedCount: number;
    latestViolationAt: string | null;
    totalCases: number;
    pendingCases: number;
    elevatedCases: number;
  };
  rows: AdminViolationDashboardRow[];
}

export const adminApi = {
  getExams: () =>
    request<(ExamResponse & { submissionCount: number; averageScore: number })[]>(
      'GET',
      '/admin/exams',
      undefined,
      true,
    ),

  getResults: () =>
    request<(ResultResponse & { studentName: string; examTitle: string })[]>(
      'GET',
      '/admin/results',
      undefined,
      true,
    ),

  getLogs: () =>
    request<AdminLogsResponse>('GET', '/admin/logs', undefined, true),

  getViolations: () =>
    request<AdminViolationDashboardResponse>('GET', '/admin/violations', undefined, true),
};
