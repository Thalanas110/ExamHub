import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from 'lucide-react';
import type {
  ViolationCase,
  ViolationCaseOutcome,
  ViolationCaseSeverity,
  ViolationRecord,
} from '@/entities/violation';

export const MAX_TAB_SWITCHES = 3;

export type ViolationReviewMode = 'all' | 'per_exam' | 'per_student' | 'per_course';

export const VIOLATION_REVIEW_MODE_OPTIONS: Array<{ value: ViolationReviewMode; label: string }> = [
  { value: 'all', label: 'All Violations' },
  { value: 'per_exam', label: 'Per Exam' },
  { value: 'per_student', label: 'Per Student' },
  { value: 'per_course', label: 'Per Course' },
];

export function suggestSeverity(violations: ViolationRecord[]): ViolationCaseSeverity {
  const hasAutoSubmit = violations.some(violation => violation.violation_type === 'auto_submitted');
  if (hasAutoSubmit || violations.length >= MAX_TAB_SWITCHES + 1) return 'critical';
  if (violations.length === MAX_TAB_SWITCHES) return 'high';
  if (violations.length === 2) return 'medium';
  return 'low';
}

export const SEVERITY_META: Record<
  ViolationCaseSeverity,
  { label: string; color: string; badgeVariant: 'error' | 'warning' | 'info' | 'gray' | 'orange' }
> = {
  critical: { label: 'Critical', color: 'text-rose-700', badgeVariant: 'error' },
  high: { label: 'High', color: 'text-orange-700', badgeVariant: 'orange' },
  medium: { label: 'Medium', color: 'text-amber-700', badgeVariant: 'warning' },
  low: { label: 'Low', color: 'text-sky-700', badgeVariant: 'info' },
};

export const OUTCOME_META: Record<
  ViolationCaseOutcome,
  { label: string; icon: React.ReactNode; badgeVariant: 'warning' | 'gray' | 'info' | 'error' | 'orange' | 'success' }
> = {
  pending: { label: 'Pending', icon: <AlertTriangle className="w-3.5 h-3.5" />, badgeVariant: 'warning' },
  dismissed: { label: 'Dismissed', icon: <CheckCircle2 className="w-3.5 h-3.5" />, badgeVariant: 'gray' },
  warned: { label: 'Warned', icon: <Info className="w-3.5 h-3.5" />, badgeVariant: 'info' },
  score_penalized: { label: 'Score Penalized', icon: <XCircle className="w-3.5 h-3.5" />, badgeVariant: 'orange' },
  invalidated: { label: 'Invalidated', icon: <XCircle className="w-3.5 h-3.5" />, badgeVariant: 'error' },
};

export function violationTypeLabel(type: string): string {
  switch (type) {
    case 'tab_switch':
      return 'Tab Switch';
    case 'window_blur':
      return 'Window Blur';
    case 'right_click':
      return 'Right Click';
    case 'auto_submitted':
      return 'Auto-Submitted';
    case 'fullscreen_exit':
      return 'Fullscreen Exit';
    case 'multiple_monitors':
      return 'Multiple Monitors';
    case 'screen_overlay':
      return 'Screen Overlay';
    default:
      return type;
  }
}

export interface ViolationCaseRow {
  rowKey: string;
  examId: string;
  examTitle: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  violations: ViolationRecord[];
  existingCase: ViolationCase | null;
  suggestedSeverity: ViolationCaseSeverity;
  outcome: ViolationCaseOutcome;
}
