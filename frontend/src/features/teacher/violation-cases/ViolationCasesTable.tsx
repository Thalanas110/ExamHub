import React from 'react';
import { Badge } from '@/shared/ui/status-badge';
import { PaginatedTable } from '@/shared/ui/PaginatedTable';
import {
  OUTCOME_META,
  SEVERITY_META,
  type ViolationCaseRow,
  type ViolationReviewMode,
  MAX_TAB_SWITCHES,
} from './case-meta';

interface ViolationCasesTableProps {
  reviewMode: ViolationReviewMode;
  rows: ViolationCaseRow[];
  onReview: (rowKey: string) => void;
}

export function ViolationCasesTable({ reviewMode, rows, onReview }: ViolationCasesTableProps) {
  const showExamColumn = reviewMode !== 'per_exam';
  const showCourseColumn = reviewMode !== 'per_course';
  const colSpan = 7 + (showExamColumn ? 1 : 0) + (showCourseColumn ? 1 : 0);
  const minWidthClassName = showExamColumn || showCourseColumn ? 'min-w-[1160px]' : 'min-w-[980px]';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <PaginatedTable
        items={rows}
        colSpan={colSpan}
        minWidthClassName={minWidthClassName}
        header={(
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {showExamColumn && <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Exam</th>}
              {showCourseColumn && <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Course</th>}
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Student</th>
              <th className="px-5 py-3.5 text-center font-semibold text-gray-600">Events</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Suggested Severity</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Case Severity</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Outcome</th>
              <th className="px-5 py-3.5 text-left font-semibold text-gray-600">Notes</th>
              <th className="px-5 py-3.5 text-right font-semibold text-gray-600">Action</th>
            </tr>
          </thead>
        )}
        emptyRow={<div className="px-5 py-10 text-center text-gray-400 text-sm">No violation cases found</div>}
        renderRow={row => {
              const outcomeMeta = OUTCOME_META[row.outcome];
              const isPending = row.outcome === 'pending';

              return (
                <tr
                  key={row.rowKey}
                  className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${isPending ? 'bg-amber-50/30' : ''}`}
                >
                  {showExamColumn && (
                    <td className="px-5 py-4 text-sm font-medium text-gray-800">
                      {row.examTitle}
                    </td>
                  )}
                  {showCourseColumn && (
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {row.className}
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-900">{row.studentName}</div>
                    {row.studentEmail && (
                      <div className="text-xs text-gray-400 mt-0.5">{row.studentEmail}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`font-bold text-sm px-2.5 py-1 rounded-full ${row.violations.length >= MAX_TAB_SWITCHES ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {row.violations.length}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={SEVERITY_META[row.suggestedSeverity].badgeVariant}>
                      {SEVERITY_META[row.suggestedSeverity].label}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    {row.existingCase ? (
                      <Badge variant={SEVERITY_META[row.existingCase.severity].badgeVariant}>
                        {SEVERITY_META[row.existingCase.severity].label}
                      </Badge>
                    ) : (
                      <span className="text-gray-300 text-xs italic">Not set</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide ${
                        outcomeMeta.badgeVariant === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : outcomeMeta.badgeVariant === 'gray'
                          ? 'bg-stone-100 text-stone-600'
                          : outcomeMeta.badgeVariant === 'info'
                          ? 'bg-sky-100 text-sky-700'
                          : outcomeMeta.badgeVariant === 'error'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {outcomeMeta.icon}
                      {outcomeMeta.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 max-w-[180px]">
                    {row.existingCase?.teacherNotes ? (
                      <p className="text-xs text-gray-600 truncate" title={row.existingCase.teacherNotes}>
                        {row.existingCase.teacherNotes}
                      </p>
                    ) : (
                      <span className="text-gray-300 text-xs italic">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onReview(row.rowKey)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              );
        }}
      />
    </div>
  );
}
