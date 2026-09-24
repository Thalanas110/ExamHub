import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Class } from '@/entities/class';
import type { Exam } from '@/entities/exam';
import type { User } from '@/entities/user';
import {
  violationApi,
  violationCaseApi,
  type ViolationCase,
  type ViolationRecord,
} from '@/entities/violation';
import { suggestSeverity, type ViolationCaseRow, type ViolationReviewMode } from './case-meta';

type CacheEntry = {
  violations: ViolationRecord[];
  cases: ViolationCase[];
};

export function useViolationCases(myExams: Exam[], classes: Class[], users: User[]) {
  const [reviewMode, setReviewMode] = useState<ViolationReviewMode>('all');
  const [selectedExamId, setSelectedExamId] = useState<string>(myExams[0]?.id ?? '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [cases, setCases] = useState<ViolationCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ rowKey: string } | null>(null);

  const requestSerialRef = useRef(0);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  useEffect(() => {
    if (myExams.length === 0) {
      setSelectedExamId('');
      return;
    }

    if (!myExams.some(exam => exam.id === selectedExamId)) {
      setSelectedExamId(myExams[0].id);
    }
  }, [myExams, selectedExamId]);

  const scopedExamIds = useMemo(() => {
    if (reviewMode === 'per_exam') {
      return selectedExamId ? [selectedExamId] : [];
    }

    return myExams.map(exam => exam.id);
  }, [myExams, reviewMode, selectedExamId]);

  const load = useCallback(async (examIds: string[], forceRefresh = false) => {
    const uniqueExamIds = Array.from(new Set(examIds.filter(Boolean)));
    if (uniqueExamIds.length === 0) {
      setViolations([]);
      setCases([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestSerialRef.current;
    setLoading(true);

    try {
      const idsToFetch = forceRefresh
        ? uniqueExamIds
        : uniqueExamIds.filter(examId => !cacheRef.current.has(examId));

      if (idsToFetch.length > 0) {
        const fetched = await Promise.all(idsToFetch.map(async examId => {
          const [violationData, caseData] = await Promise.all([
            violationApi.listByExam(examId),
            violationCaseApi.listByExam(examId),
          ]);

          return {
            examId,
            violations: violationData,
            cases: caseData,
          };
        }));

        if (requestId !== requestSerialRef.current) return;

        for (const entry of fetched) {
          cacheRef.current.set(entry.examId, {
            violations: entry.violations,
            cases: entry.cases,
          });
        }
      }

      if (requestId !== requestSerialRef.current) return;

      const nextViolations = uniqueExamIds.flatMap(examId => cacheRef.current.get(examId)?.violations ?? []);
      const nextCases = uniqueExamIds.flatMap(examId => cacheRef.current.get(examId)?.cases ?? []);

      setViolations(nextViolations);
      setCases(nextCases);
    } catch (error) {
      if (requestId !== requestSerialRef.current) return;
      toast.error(error instanceof Error ? error.message : 'Failed to load data.');
    } finally {
      if (requestId !== requestSerialRef.current) return;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(scopedExamIds, false);
  }, [load, scopedExamIds]);

  const examLookup = useMemo(() => new Map(myExams.map(exam => [exam.id, exam])), [myExams]);
  const classLookup = useMemo(() => new Map(classes.map(cls => [cls.id, cls])), [classes]);
  const userLookup = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
  const caseLookup = useMemo(() => new Map(cases.map(caseItem => [`${caseItem.examId}::${caseItem.studentId}`, caseItem])), [cases]);

  const allRows = useMemo<ViolationCaseRow[]>(() => {
    const rowMap = new Map<string, Omit<ViolationCaseRow, 'existingCase' | 'outcome' | 'suggestedSeverity'>>();

    const ensureRow = (examId: string, studentId: string) => {
      const key = `${examId}::${studentId}`;
      const existing = rowMap.get(key);
      if (existing) return existing;

      const exam = examLookup.get(examId);
      const linkedClass = exam ? classLookup.get(exam.classId) : null;
      const linkedUser = userLookup.get(studentId);
      const linkedCase = caseLookup.get(key);

      const created: Omit<ViolationCaseRow, 'existingCase' | 'outcome' | 'suggestedSeverity'> = {
        rowKey: key,
        examId,
        examTitle: exam?.title ?? 'Unknown Exam',
        classId: exam?.classId ?? linkedClass?.id ?? '',
        className: linkedClass?.name ?? 'Unknown Course',
        studentId,
        studentName: linkedCase?.studentName ?? linkedUser?.name ?? studentId,
        studentEmail: linkedCase?.studentEmail ?? linkedUser?.email ?? '',
        violations: [],
      };

      rowMap.set(key, created);
      return created;
    };

    for (const violation of violations) {
      ensureRow(violation.exam_id, violation.student_id).violations.push(violation);
    }

    for (const caseItem of cases) {
      const row = ensureRow(caseItem.examId, caseItem.studentId);
      row.studentName = caseItem.studentName;
      row.studentEmail = caseItem.studentEmail;
      const exam = examLookup.get(caseItem.examId);
      if (exam) {
        row.examTitle = exam.title;
        row.classId = exam.classId;
        row.className = classLookup.get(exam.classId)?.name ?? row.className;
      }
    }

    return Array.from(rowMap.values())
      .map(entry => {
        const existingCase = caseLookup.get(entry.rowKey) ?? null;
        return {
          ...entry,
          existingCase,
          suggestedSeverity: suggestSeverity(entry.violations),
          outcome: existingCase?.outcome ?? 'pending',
        };
      })
      .sort((left, right) => {
        if (left.outcome === 'pending' && right.outcome !== 'pending') return -1;
        if (left.outcome !== 'pending' && right.outcome === 'pending') return 1;
        if (right.violations.length !== left.violations.length) {
          return right.violations.length - left.violations.length;
        }

        return left.studentName.localeCompare(right.studentName);
      });
  }, [caseLookup, cases, classLookup, examLookup, userLookup, violations]);

  const studentOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of allRows) {
      if (!seen.has(row.studentId)) {
        seen.set(row.studentId, row.studentName);
      }
    }

    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [allRows]);

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of allRows) {
      if (row.classId && !seen.has(row.classId)) {
        seen.set(row.classId, row.className);
      }
    }

    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [allRows]);

  useEffect(() => {
    if (reviewMode !== 'per_student') return;

    if (studentOptions.length === 0) {
      if (selectedStudentId) setSelectedStudentId('');
      return;
    }

    if (!studentOptions.some(option => option.id === selectedStudentId)) {
      setSelectedStudentId(studentOptions[0].id);
    }
  }, [reviewMode, selectedStudentId, studentOptions]);

  useEffect(() => {
    if (reviewMode !== 'per_course') return;

    if (courseOptions.length === 0) {
      if (selectedCourseId) setSelectedCourseId('');
      return;
    }

    if (!courseOptions.some(option => option.id === selectedCourseId)) {
      setSelectedCourseId(courseOptions[0].id);
    }
  }, [courseOptions, reviewMode, selectedCourseId]);

  const rows = useMemo(
    () => allRows.filter(row => {
      if (reviewMode === 'per_exam') {
        return selectedExamId ? row.examId === selectedExamId : false;
      }
      if (reviewMode === 'per_student') {
        return selectedStudentId ? row.studentId === selectedStudentId : false;
      }
      if (reviewMode === 'per_course') {
        return selectedCourseId ? row.classId === selectedCourseId : false;
      }

      return true;
    }),
    [allRows, reviewMode, selectedCourseId, selectedExamId, selectedStudentId],
  );

  const selectedExam = myExams.find(exam => exam.id === selectedExamId) ?? null;

  const pendingCount = useMemo(
    () => rows.filter(row => !row.existingCase || row.outcome === 'pending').length,
    [rows],
  );

  const reviewingRow = useMemo(
    () => (reviewTarget ? rows.find(row => row.rowKey === reviewTarget.rowKey) ?? null : null),
    [reviewTarget, rows],
  );

  const handleCaseSaved = (savedCase: ViolationCase) => {
    setCases(previous => {
      const existingIndex = previous.findIndex(
        caseItem => caseItem.studentId === savedCase.studentId && caseItem.examId === savedCase.examId,
      );

      if (existingIndex >= 0) {
        const next = [...previous];
        next[existingIndex] = savedCase;
        return next;
      }

      return [savedCase, ...previous];
    });

    const cacheEntry = cacheRef.current.get(savedCase.examId);
    if (cacheEntry) {
      const existingIndex = cacheEntry.cases.findIndex(
        caseItem => caseItem.studentId === savedCase.studentId && caseItem.examId === savedCase.examId,
      );

      const nextCases = [...cacheEntry.cases];
      if (existingIndex >= 0) {
        nextCases[existingIndex] = savedCase;
      } else {
        nextCases.unshift(savedCase);
      }

      cacheRef.current.set(savedCase.examId, {
        ...cacheEntry,
        cases: nextCases,
      });
    }

    setReviewTarget(null);
  };

  return {
    reviewMode,
    setReviewMode,
    selectedExamId,
    setSelectedExamId,
    selectedStudentId,
    setSelectedStudentId,
    selectedCourseId,
    setSelectedCourseId,
    studentOptions,
    courseOptions,
    violations,
    loading,
    rows,
    selectedExam,
    pendingCount,
    reviewTarget,
    setReviewTarget,
    reviewingRow,
    handleCaseSaved,
    refresh: () => load(scopedExamIds, true),
  };
}
