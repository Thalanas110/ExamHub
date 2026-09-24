import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BarChart2,
  Download,
  FileJson,
  FileText,
  Printer,
  Search,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, getGradeBadge, getStatusBadge } from '../../components/shared/Badge';
import { StatCard } from '../../components/shared/StatCard';
import { useApp } from '../../context/AppContext';
import type { Class, Exam, ExamStatus, Question, QuestionType, Submission, User } from '../../data/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
  csvRowsToRecords,
  downloadCsv,
  downloadText,
  getRecordValue,
  parseCsv,
  slugify,
  timestampSlug,
} from './import-export-utils';

interface ImportExportToolsProps {
  audience: 'admin' | 'teacher';
}

type AnalyticsExportKind = 'submissions' | 'classes' | 'exams';

const today = () => new Date().toISOString().split('T')[0];

const allowedQuestionTypes: QuestionType[] = ['mcq', 'short_answer', 'essay'];
const allowedExamStatuses: ExamStatus[] = ['draft', 'published', 'completed'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function initials(name?: string) {
  return (name || 'U')
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(value?: string) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function normalizeQuestion(rawQuestion: unknown, index: number): Question {
  const question = asRecord(rawQuestion) ?? {};
  const rawType = asString(question.type, 'mcq') as QuestionType;
  const type = allowedQuestionTypes.includes(rawType) ? rawType : 'mcq';
  const options = Array.isArray(question.options)
    ? question.options.map(option => String(option)).filter(option => option.trim() !== '')
    : type === 'mcq'
      ? ['', '']
      : undefined;

  return {
    id: asString(question.id, Math.random().toString(36).slice(2, 11)),
    text: asString(question.text, `Question ${index + 1}`),
    type,
    topic: typeof question.topic === 'string' ? question.topic : null,
    options,
    correctAnswer: asString(question.correctAnswer),
    marks: asNumber(question.marks, 1),
  };
}

function createExamPayload(rawExam: Record<string, unknown>, fallbackClass: Class, fallbackTeacherId: string): Omit<Exam, 'id' | 'createdAt'> {
  const questions = Array.isArray(rawExam.questions)
    ? rawExam.questions.map(normalizeQuestion)
    : [];
  const rawStatus = asString(rawExam.status, 'draft') as ExamStatus;
  const status = allowedExamStatuses.includes(rawStatus) ? rawStatus : 'draft';
  const totalMarks = asNumber(rawExam.totalMarks, questions.reduce((sum, question) => sum + question.marks, 0) || 1);

  return {
    title: asString(rawExam.title, 'Imported Exam'),
    description: asString(rawExam.description, 'Imported exam backup'),
    classId: fallbackClass.id,
    teacherId: asString(rawExam.teacherId, fallbackTeacherId) || fallbackTeacherId,
    duration: asNumber(rawExam.duration, 60),
    totalMarks,
    passingMarks: asNumber(rawExam.passingMarks, Math.max(1, Math.round(totalMarks * 0.5))),
    startDate: asString(rawExam.startDate),
    endDate: asString(rawExam.endDate),
    status,
    questions,
  };
}

function ToolCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-500 uppercase tracking-[0.12em] mb-1.5">{children}</label>;
}

function ActionButton({
  icon: Icon,
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        variant === 'primary'
          ? 'bg-gray-900 text-white hover:bg-gray-700'
          : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

function ResultSlipPrint({
  submission,
  exam,
  examClass,
  student,
  teacher,
}: {
  submission: Submission;
  exam?: Exam;
  examClass?: Class;
  student?: User;
  teacher?: User;
}) {
  const totalMarks = exam?.totalMarks ?? submission.totalScore ?? 0;
  const score = submission.totalScore ?? 0;
  const passed = exam ? score >= exam.passingMarks : false;

  return (
    <div className="result-slip-print">
      <div className="mx-auto max-w-[760px] bg-white text-gray-900">
        <div className="border-b-2 border-gray-900 pb-5 mb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">ExamHub</div>
              <h1 className="mt-2 text-3xl font-semibold text-gray-900">Result Slip</h1>
              <p className="mt-1 text-sm text-gray-500">{formatDateTime(submission.gradedAt || submission.submittedAt)}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-semibold text-gray-900">{submission.percentage ?? 0}%</div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-gray-600">{submission.grade || 'Ungraded'}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Student</div>
            <div className="mt-1 font-semibold text-gray-900">{student?.name || 'Unknown student'}</div>
            <div className="text-gray-600">{student?.email || '-'}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Exam</div>
            <div className="mt-1 font-semibold text-gray-900">{exam?.title || 'Unknown exam'}</div>
            <div className="text-gray-600">{examClass?.name || '-'}{teacher ? ` - ${teacher.name}` : ''}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Score</div>
            <div className="mt-1 font-semibold text-gray-900">{score}/{totalMarks}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Standing</div>
            <div className="mt-1 font-semibold text-gray-900">{passed ? 'Passed' : 'Needs review'}</div>
          </div>
        </div>

        {submission.feedback && (
          <div className="mt-6 rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Feedback</div>
            <p className="mt-2 text-sm leading-6 text-gray-700">{submission.feedback}</p>
          </div>
        )}

        {exam && (
          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-xs uppercase tracking-[0.16em] text-gray-500">
                <th className="py-3 pr-4 font-semibold">Question</th>
                <th className="py-3 pr-4 font-semibold">Type</th>
                <th className="py-3 text-right font-semibold">Marks</th>
              </tr>
            </thead>
            <tbody>
              {exam.questions.map((question, index) => {
                const answer = submission.answers.find(item => item.questionId === question.id);
                return (
                  <tr key={question.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 text-gray-900">Q{index + 1}. {question.text}</td>
                    <td className="py-3 pr-4 text-gray-600">{question.type.replace('_', ' ')}</td>
                    <td className="py-3 text-right font-semibold text-gray-900">{answer?.marksAwarded ?? '-'}/{question.marks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function ImportExportTools({ audience }: ImportExportToolsProps) {
  const {
    currentUser,
    users,
    classes,
    exams,
    submissions,
    addUser,
    updateClass,
    addExam,
    getUserById,
  } = useApp();
  const rosterInputRef = useRef<HTMLInputElement | null>(null);
  const examInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [resultSearchQuery, setResultSearchQuery] = useState('');
  const [resultStudentId, setResultStudentId] = useState('all');
  const [resultCourseId, setResultCourseId] = useState('all');
  const [resultExamId, setResultExamId] = useState('all');
  const [analyticsKind, setAnalyticsKind] = useState<AnalyticsExportKind>('submissions');
  const [printTargetId, setPrintTargetId] = useState<string | null>(null);
  const [busyImport, setBusyImport] = useState<'roster' | 'exam' | null>(null);

  const visibleClasses = useMemo(() => {
    if (!currentUser || audience === 'admin') return classes;
    return classes.filter(item => item.teacherId === currentUser.id);
  }, [audience, classes, currentUser]);

  const visibleClassIds = useMemo(() => new Set(visibleClasses.map(item => item.id)), [visibleClasses]);

  const visibleExams = useMemo(() => (
    audience === 'admin'
      ? exams
      : exams.filter(item => visibleClassIds.has(item.classId))
  ), [audience, exams, visibleClassIds]);

  const visibleExamIds = useMemo(() => new Set(visibleExams.map(item => item.id)), [visibleExams]);
  const visibleSubmissions = useMemo(() => (
    submissions.filter(item => visibleExamIds.has(item.examId))
  ), [submissions, visibleExamIds]);
  const gradedSubmissions = useMemo(() => (
    visibleSubmissions.filter(item => item.status === 'graded')
  ), [visibleSubmissions]);

  const resultRows = useMemo(() => (
    gradedSubmissions
      .map(submission => {
        const exam = exams.find(item => item.id === submission.examId);
        const examClass = exam ? classes.find(item => item.id === exam.classId) : undefined;
        const student = getUserById(submission.studentId);
        const gradeLabel = submission.grade || `${submission.percentage ?? 0}%`;
        return {
          submission,
          exam,
          examClass,
          student,
          gradeLabel,
          searchText: [
            student?.name || '',
            student?.email || '',
            exam?.title || '',
            examClass?.name || '',
            examClass?.subject || '',
            gradeLabel,
          ].join(' ').toLowerCase(),
        };
      })
      .sort((left, right) => {
        const studentCompare = (left.student?.name || '').localeCompare(right.student?.name || '');
        if (studentCompare !== 0) return studentCompare;
        return (left.exam?.title || '').localeCompare(right.exam?.title || '');
      })
  ), [classes, exams, getUserById, gradedSubmissions]);

  const resultStudentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of resultRows) {
      if (!map.has(row.submission.studentId)) {
        map.set(row.submission.studentId, row.student?.name || 'Unknown student');
      }
    }

    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [resultRows]);

  const resultCourseOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of resultRows) {
      if (!row.examClass?.id) continue;
      if (!map.has(row.examClass.id)) {
        map.set(row.examClass.id, row.examClass.name);
      }
    }

    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [resultRows]);

  const resultExamOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of resultRows) {
      if (!row.exam?.id) continue;
      if (resultCourseId !== 'all' && row.exam.classId !== resultCourseId) continue;
      if (!map.has(row.exam.id)) {
        map.set(row.exam.id, row.exam.title);
      }
    }

    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [resultCourseId, resultRows]);

  const normalizedResultSearch = resultSearchQuery.trim().toLowerCase();

  const filteredResultRows = useMemo(() => (
    resultRows.filter(row => {
      if (resultStudentId !== 'all' && row.submission.studentId !== resultStudentId) return false;
      if (resultCourseId !== 'all' && row.examClass?.id !== resultCourseId) return false;
      if (resultExamId !== 'all' && row.exam?.id !== resultExamId) return false;
      if (normalizedResultSearch && !row.searchText.includes(normalizedResultSearch)) return false;
      return true;
    })
  ), [normalizedResultSearch, resultCourseId, resultExamId, resultRows, resultStudentId]);

  const selectedClass = visibleClasses.find(item => item.id === selectedClassId);
  const selectedExam = visibleExams.find(item => item.id === selectedExamId);
  const selectedResultRow = filteredResultRows.find(item => item.submission.id === selectedSubmissionId);
  const printSubmission = printTargetId ? gradedSubmissions.find(item => item.id === printTargetId) : undefined;
  const printExam = printSubmission ? exams.find(item => item.id === printSubmission.examId) : undefined;
  const printClass = printExam ? classes.find(item => item.id === printExam.classId) : undefined;
  const printStudent = printSubmission ? getUserById(printSubmission.studentId) : undefined;
  const printTeacher = printExam ? getUserById(printExam.teacherId) : undefined;

  useEffect(() => {
    if (!selectedClassId && visibleClasses[0]) setSelectedClassId(visibleClasses[0].id);
    if (selectedClassId && !visibleClasses.some(item => item.id === selectedClassId)) {
      setSelectedClassId(visibleClasses[0]?.id || '');
    }
  }, [selectedClassId, visibleClasses]);

  useEffect(() => {
    if (!selectedExamId && visibleExams[0]) setSelectedExamId(visibleExams[0].id);
    if (selectedExamId && !visibleExams.some(item => item.id === selectedExamId)) {
      setSelectedExamId(visibleExams[0]?.id || '');
    }
  }, [selectedExamId, visibleExams]);

  useEffect(() => {
    if (resultStudentId !== 'all' && !resultStudentOptions.some(option => option.id === resultStudentId)) {
      setResultStudentId('all');
    }
  }, [resultStudentId, resultStudentOptions]);

  useEffect(() => {
    if (resultCourseId !== 'all' && !resultCourseOptions.some(option => option.id === resultCourseId)) {
      setResultCourseId('all');
    }
  }, [resultCourseId, resultCourseOptions]);

  useEffect(() => {
    if (resultExamId !== 'all' && !resultExamOptions.some(option => option.id === resultExamId)) {
      setResultExamId('all');
    }
  }, [resultExamId, resultExamOptions]);

  useEffect(() => {
    if (filteredResultRows.length === 0) {
      if (selectedSubmissionId) setSelectedSubmissionId('');
      return;
    }

    if (!selectedSubmissionId || !filteredResultRows.some(item => item.submission.id === selectedSubmissionId)) {
      setSelectedSubmissionId(filteredResultRows[0].submission.id);
    }
  }, [filteredResultRows, selectedSubmissionId]);

  useEffect(() => {
    if (!printTargetId) return undefined;

    const clearPrintTarget = () => setPrintTargetId(null);
    const timeout = window.setTimeout(() => window.print(), 120);
    window.addEventListener('afterprint', clearPrintTarget, { once: true });

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('afterprint', clearPrintTarget);
    };
  }, [printTargetId]);

  const handleExportRoster = () => {
    if (!selectedClass) {
      toast.error('Select a class first');
      return;
    }

    const rosterStudents = users
      .filter(user => user.role === 'student' && selectedClass.studentIds.includes(user.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    downloadCsv(`${slugify(selectedClass.name)}-roster-${timestampSlug()}.csv`, [
      ['class_name', 'class_code', 'student_name', 'email', 'department', 'phone', 'joined_at'],
      ...rosterStudents.map(student => [
        selectedClass.name,
        selectedClass.code,
        student.name,
        student.email,
        student.department || '',
        student.phone || '',
        student.joinedAt,
      ]),
    ]);
    toast.success('Roster CSV exported');
  };

  const handleDownloadRosterTemplate = () => {
    downloadCsv(`class-roster-template-${timestampSlug()}.csv`, [
      ['name', 'email', 'password', 'department', 'phone'],
      ['Sample Student', 'student@example.com', 'Student123!', 'Science', ''],
    ]);
  };

  const handleImportRosterFile = async (file: File | undefined) => {
    if (!file || !selectedClass) return;

    setBusyImport('roster');
    try {
      const records = csvRowsToRecords(parseCsv(await file.text()));
      if (records.length === 0) {
        toast.error('Roster CSV has no student rows');
        return;
      }

      const studentsByEmail = new Map(
        users
          .filter(user => user.role === 'student')
          .map(user => [user.email.toLowerCase(), user]),
      );
      const createdByEmail = new Map<string, User>();
      const nextStudentIds = new Set(selectedClass.studentIds);
      let createdCount = 0;
      let enrolledCount = 0;
      let skippedCount = 0;
      let rejectedCount = 0;

      for (const record of records) {
        const email = getRecordValue(record, ['email', 'student_email']).toLowerCase();
        const name = getRecordValue(record, ['name', 'student_name', 'full_name']);

        if (!email || !name) {
          rejectedCount += 1;
          continue;
        }

        let student = studentsByEmail.get(email) ?? createdByEmail.get(email);
        if (!student) {
          student = await addUser({
            name,
            email,
            password: getRecordValue(record, ['password']) || 'Student123!',
            role: 'student',
            department: getRecordValue(record, ['department', 'section', 'strand']),
            phone: getRecordValue(record, ['phone', 'contact_number']),
            joinedAt: today(),
          });
          createdByEmail.set(email, student);
          createdCount += 1;
        }

        if (student.role !== 'student') {
          rejectedCount += 1;
          continue;
        }

        if (nextStudentIds.has(student.id)) {
          skippedCount += 1;
          continue;
        }

        nextStudentIds.add(student.id);
        enrolledCount += 1;
      }

      updateClass(selectedClass.id, { studentIds: Array.from(nextStudentIds) });
      toast.success(`Roster imported: ${enrolledCount} enrolled, ${createdCount} created, ${skippedCount} skipped, ${rejectedCount} rejected`);
    } catch (error) {
      console.error('Roster import failed:', error);
      toast.error('Unable to import roster CSV');
    } finally {
      setBusyImport(null);
    }
  };

  const handleExportExamBackup = () => {
    if (!selectedExam) {
      toast.error('Select an exam first');
      return;
    }

    const examClass = classes.find(item => item.id === selectedExam.classId);
    const teacher = getUserById(selectedExam.teacherId);
    const backup = {
      kind: 'examhub.exam.backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      exam: selectedExam,
      class: examClass ? {
        id: examClass.id,
        name: examClass.name,
        subject: examClass.subject,
        code: examClass.code,
      } : null,
      teacher: teacher ? {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
      } : null,
    };

    downloadText(
      `${slugify(selectedExam.title)}-exam-backup-${timestampSlug()}.json`,
      JSON.stringify(backup, null, 2),
      'application/json;charset=utf-8',
    );
    toast.success('Exam backup exported');
  };

  const handleImportExamFile = async (file: File | undefined) => {
    if (!file || !currentUser) return;

    setBusyImport('exam');
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const container = asRecord(raw);
      const rawExam = asRecord(container?.exam ?? raw);
      if (!rawExam) {
        toast.error('Exam backup is not valid');
        return;
      }

      const classFromBackup = visibleClasses.find(item => item.id === asString(rawExam.classId));
      const fallbackClass = classFromBackup ?? selectedClass ?? visibleClasses[0];
      if (!fallbackClass) {
        toast.error('Create or select a class before importing an exam');
        return;
      }

      const fallbackTeacherId = audience === 'teacher'
        ? currentUser.id
        : fallbackClass.teacherId || asString(rawExam.teacherId, currentUser.id);
      const payload = createExamPayload(rawExam, fallbackClass, fallbackTeacherId);

      await addExam({
        ...payload,
        title: exams.some(item => item.title === payload.title) ? `${payload.title} (Imported)` : payload.title,
      });
      toast.success('Exam backup imported');
    } catch (error) {
      console.error('Exam import failed:', error);
      toast.error('Unable to import exam backup');
    } finally {
      setBusyImport(null);
    }
  };

  const exportSubmissionAnalytics = () => {
    downloadCsv(`${audience}-submission-analytics-${timestampSlug()}.csv`, [
      ['student_name', 'student_email', 'exam_title', 'class_name', 'status', 'score', 'total_marks', 'percentage', 'grade', 'submitted_at', 'graded_at'],
      ...visibleSubmissions.map(submission => {
        const exam = exams.find(item => item.id === submission.examId);
        const examClass = exam ? classes.find(item => item.id === exam.classId) : undefined;
        const student = getUserById(submission.studentId);
        return [
          student?.name || 'Unknown',
          student?.email || '',
          exam?.title || 'Unknown',
          examClass?.name || '',
          submission.status,
          submission.totalScore ?? '',
          exam?.totalMarks ?? '',
          submission.percentage ?? '',
          submission.grade || '',
          submission.submittedAt,
          submission.gradedAt || '',
        ];
      }),
    ]);
  };

  const exportClassPerformance = () => {
    downloadCsv(`${audience}-class-performance-${timestampSlug()}.csv`, [
      ['class_name', 'subject', 'teacher', 'enrolled_students', 'exams', 'graded_submissions', 'average_percentage', 'pass_rate'],
      ...visibleClasses.map(item => {
        const classExams = visibleExams.filter(exam => exam.classId === item.id);
        const classExamIds = new Set(classExams.map(exam => exam.id));
        const classSubmissions = gradedSubmissions.filter(submission => classExamIds.has(submission.examId));
        const average = classSubmissions.length
          ? Math.round(classSubmissions.reduce((sum, submission) => sum + (submission.percentage || 0), 0) / classSubmissions.length)
          : 0;
        const passed = classSubmissions.filter(submission => {
          const exam = exams.find(candidate => candidate.id === submission.examId);
          return exam ? (submission.totalScore || 0) >= exam.passingMarks : false;
        }).length;
        const passRate = classSubmissions.length ? Math.round((passed / classSubmissions.length) * 100) : 0;
        return [
          item.name,
          item.subject,
          getUserById(item.teacherId)?.name || '',
          item.studentIds.length,
          classExams.length,
          classSubmissions.length,
          average,
          passRate,
        ];
      }),
    ]);
  };

  const exportExamSummaries = () => {
    downloadCsv(`${audience}-exam-summaries-${timestampSlug()}.csv`, [
      ['exam_title', 'class_name', 'teacher', 'status', 'total_marks', 'passing_marks', 'submissions', 'graded_submissions', 'average_percentage', 'pass_rate'],
      ...visibleExams.map(exam => {
        const examSubmissions = visibleSubmissions.filter(submission => submission.examId === exam.id);
        const graded = examSubmissions.filter(submission => submission.status === 'graded');
        const average = graded.length
          ? Math.round(graded.reduce((sum, submission) => sum + (submission.percentage || 0), 0) / graded.length)
          : 0;
        const passRate = graded.length
          ? Math.round((graded.filter(submission => (submission.totalScore || 0) >= exam.passingMarks).length / graded.length) * 100)
          : 0;
        return [
          exam.title,
          classes.find(item => item.id === exam.classId)?.name || '',
          getUserById(exam.teacherId)?.name || '',
          exam.status,
          exam.totalMarks,
          exam.passingMarks,
          examSubmissions.length,
          graded.length,
          average,
          passRate,
        ];
      }),
    ]);
  };

  const handleExportAnalytics = () => {
    if (analyticsKind === 'submissions') exportSubmissionAnalytics();
    if (analyticsKind === 'classes') exportClassPerformance();
    if (analyticsKind === 'exams') exportExamSummaries();
    toast.success('Analytics CSV exported');
  };

  const selectedRosterCount = selectedClass?.studentIds.length ?? 0;
  const selectedExamSubmissions = selectedExam
    ? visibleSubmissions.filter(item => item.examId === selectedExam.id).length
    : 0;

  return (
    <div className="space-y-6 import-export-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import / Export Tools</h1>
        <p className="text-gray-500 mt-0.5 text-sm">
          {audience === 'admin' ? 'Platform data exchange and records output' : 'Class data exchange and records output'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Classes" value={visibleClasses.length} icon={Users} subtitle={`${selectedRosterCount} in selected roster`} />
        <StatCard title="Exam Backups" value={visibleExams.length} icon={Archive} subtitle={`${selectedExamSubmissions} selected submissions`} />
        <StatCard title="Result Slips" value={gradedSubmissions.length} icon={FileText} subtitle="Graded records" />
        <StatCard title="CSV Rows" value={visibleSubmissions.length} icon={BarChart2} subtitle="Analytics source rows" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ToolCard icon={Users} title="Class Rosters">
          <div>
            <FieldLabel>Class</FieldLabel>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleClasses.map(item => (
                  <SelectItem key={item.id} value={item.id}>{item.name} - {item.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClass && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Badge>{selectedClass.subject}</Badge>
              <span>{selectedClass.studentIds.length} students</span>
              <span>{getUserById(selectedClass.teacherId)?.name || 'Unassigned teacher'}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Download} onClick={handleExportRoster} disabled={!selectedClass} variant="secondary">Export CSV</ActionButton>
            <ActionButton icon={FileText} onClick={handleDownloadRosterTemplate} variant="secondary">Template</ActionButton>
            <ActionButton icon={Upload} onClick={() => rosterInputRef.current?.click()} disabled={!selectedClass || busyImport === 'roster'}>
              {busyImport === 'roster' ? 'Importing...' : 'Import CSV'}
            </ActionButton>
          </div>

          <input
            ref={rosterInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={event => {
              void handleImportRosterFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </ToolCard>

        <ToolCard icon={Archive} title="Exam Backups">
          <div>
            <FieldLabel>Exam</FieldLabel>
            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleExams.map(item => (
                  <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedExam && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Badge variant={getStatusBadge(selectedExam.status)}>{selectedExam.status}</Badge>
              <span>{selectedExam.questions.length} questions</span>
              <span>{selectedExam.totalMarks} marks</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Download} onClick={handleExportExamBackup} disabled={!selectedExam} variant="secondary">Export JSON</ActionButton>
            <ActionButton icon={FileJson} onClick={() => examInputRef.current?.click()} disabled={busyImport === 'exam' || visibleClasses.length === 0}>
              {busyImport === 'exam' ? 'Importing...' : 'Import JSON'}
            </ActionButton>
          </div>

          <input
            ref={examInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={event => {
              void handleImportExamFile(event.currentTarget.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </ToolCard>

        <ToolCard icon={Printer} title="PDF Result Slips">
          <div className="space-y-2">
            <FieldLabel>Search & Filters</FieldLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={resultSearchQuery}
                  onChange={event => setResultSearchQuery(event.target.value)}
                  placeholder="Search student, course, exam, grade..."
                  className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pr-3 pl-9 text-sm"
                />
              </div>
              <Select value={resultStudentId} onValueChange={setResultStudentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {resultStudentOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resultCourseId} onValueChange={setResultCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {resultCourseOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resultExamId} onValueChange={setResultExamId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All exams</SelectItem>
                  {resultExamOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
              <span>
                {filteredResultRows.length} matching result{filteredResultRows.length !== 1 ? 's' : ''}
              </span>
              {resultSearchQuery && (
                <button
                  type="button"
                  onClick={() => setResultSearchQuery('')}
                  className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 hover:bg-gray-50"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>

          <div>
            <FieldLabel>Result</FieldLabel>
            <Select value={selectedSubmissionId} onValueChange={setSelectedSubmissionId} disabled={filteredResultRows.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No matching graded results" />
              </SelectTrigger>
              <SelectContent>
                {filteredResultRows.map(row => (
                  <SelectItem key={row.submission.id} value={row.submission.id}>
                    {row.student?.name || 'Unknown'} - {row.exam?.title || 'Exam'} - {row.examClass?.name || 'Class'} - {row.gradeLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedResultRow && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
              <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center text-xs font-semibold text-white">
                {initials(selectedResultRow.student?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-900 truncate">{selectedResultRow.student?.name || 'Unknown student'}</div>
                <div className="text-xs text-gray-500 truncate">
                  {selectedResultRow.exam?.title || 'Unknown exam'} - {selectedResultRow.examClass?.name || 'Unknown course'}
                </div>
              </div>
              <Badge variant={getGradeBadge(selectedResultRow.submission.grade)}>
                {selectedResultRow.gradeLabel}
              </Badge>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton
              icon={Printer}
              onClick={() => selectedResultRow && setPrintTargetId(selectedResultRow.submission.id)}
              disabled={!selectedResultRow}
            >
              Print Slip
            </ActionButton>
          </div>
        </ToolCard>

        <ToolCard icon={BarChart2} title="CSV Analytics">
          <div>
            <FieldLabel>Dataset</FieldLabel>
            <Select value={analyticsKind} onValueChange={value => setAnalyticsKind(value as AnalyticsExportKind)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="submissions">Submission analytics</SelectItem>
                <SelectItem value="classes">Class performance</SelectItem>
                <SelectItem value="exams">Exam summaries</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="text-lg font-semibold text-gray-900">{visibleSubmissions.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Submissions</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="text-lg font-semibold text-gray-900">{visibleClasses.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Classes</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="text-lg font-semibold text-gray-900">{visibleExams.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Exams</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton icon={Download} onClick={handleExportAnalytics} variant="secondary">Export CSV</ActionButton>
          </div>
        </ToolCard>
      </div>

      {printSubmission && (
        <ResultSlipPrint
          submission={printSubmission}
          exam={printExam}
          examClass={printClass}
          student={printStudent}
          teacher={printTeacher}
        />
      )}
    </div>
  );
}
