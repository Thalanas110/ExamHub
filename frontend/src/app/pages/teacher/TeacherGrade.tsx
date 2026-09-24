import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { toast } from 'sonner';
import type { Exam, Submission } from '../../data/types';
import { ExamSelectionChips } from '../../features/teacher/grade/components/ExamSelectionChips';
import { GradeFilterTabs, type GradeFilter } from '../../features/teacher/grade/components/GradeFilterTabs';
import { GradeSubmissionView } from '../../features/teacher/grade/components/GradeSubmissionView';
import { SubmissionViolationsModal } from '../../features/teacher/grade/components/SubmissionViolationsModal';
import { SubmissionsTable } from '../../features/teacher/grade/components/SubmissionsTable';
import { useSubmissionViolations } from '../../features/teacher/grade/hooks/useSubmissionViolations';

export function TeacherGrade() {
  const { currentUser, exams, submissions, classes, getUserById, gradeSubmission } = useApp();
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState(false);
  const [filter, setFilter] = useState<GradeFilter>('pending');
  const [search, setSearch] = useState('');
  const {
    violationsModal,
    violations,
    violationsLoading,
    openViolations,
    closeViolations,
  } = useSubmissionViolations();

  const myExams = useMemo(
    () => (currentUser ? exams.filter(exam => exam.teacherId === currentUser.id) : []),
    [currentUser?.id, exams],
  );
  const myExamIds = new Set(myExams.map(exam => exam.id));
  const allSubs = submissions.filter(submission => myExamIds.has(submission.examId));
  const courseExamIds = selectedCourse
    ? new Set(myExams.filter(exam => exam.classId === selectedCourse).map(exam => exam.id))
    : null;

  const filteredSubs = allSubs.filter(submission => {
    if (filter === 'pending') return submission.status === 'submitted';
    if (filter === 'graded') return submission.status === 'graded';
    return true;
  }).filter(submission => {
    const query = search.trim().toLowerCase();
    if (query === '') return true;

    const exam = myExams.find(item => item.id === submission.examId);
    const student = getUserById(submission.studentId);
    const cls = exam ? classes.find(item => item.id === exam.classId) : null;
    return (student?.name.toLowerCase().includes(query) ?? false)
      || (student?.email.toLowerCase().includes(query) ?? false)
      || (exam?.title.toLowerCase().includes(query) ?? false)
      || (cls?.name.toLowerCase().includes(query) ?? false);
  });

  const scopedSubs = courseExamIds
    ? filteredSubs.filter(submission => courseExamIds.has(submission.examId))
    : filteredSubs;
  const examSubs = selectedExam ? scopedSubs.filter(submission => submission.examId === selectedExam) : scopedSubs;
  const subToGrade = selectedSub ? allSubs.find(submission => submission.id === selectedSub) : null;
  const subExam = subToGrade ? myExams.find(exam => exam.id === subToGrade.examId) : null;
  const student = subToGrade ? getUserById(subToGrade.studentId) : null;

  useEffect(() => {
    if (selectedCourse && !myExams.some(exam => exam.classId === selectedCourse)) {
      setSelectedCourse(null);
    }
  }, [myExams, selectedCourse]);

  useEffect(() => {
    if (!selectedExam) return;

    const stillValid = myExams.some(exam => (
      exam.id === selectedExam && (!selectedCourse || exam.classId === selectedCourse)
    ));

    if (!stillValid) {
      setSelectedExam(null);
    }
  }, [myExams, selectedCourse, selectedExam]);

  const openGrade = (submission: Submission, exam: Exam) => {
    setSelectedSub(submission.id);
    const initialGrades: Record<string, number> = {};
    exam.questions.forEach(question => {
      const answer = submission.answers.find(item => item.questionId === question.id);
      initialGrades[question.id] = answer?.marksAwarded ?? (question.type === 'mcq' ? (answer?.answer === question.correctAnswer ? question.marks : 0) : 0);
    });
    setGradeInputs(initialGrades);
    setFeedback(submission.feedback || '');
  };

  const handleGradeSubmit = () => {
    if (!subToGrade || !subExam) return;

    const nonMcqQuestions = subExam.questions.filter(question => question.type !== 'mcq');
    const hasUngraded = nonMcqQuestions.some(question => gradeInputs[question.id] === undefined);
    if (hasUngraded) {
      toast.error('Please provide marks for all questions');
      return;
    }

    const gradeData = subExam.questions.map(question => ({
      questionId: question.id,
      marksAwarded: gradeInputs[question.id] ?? 0,
    }));

    setSubmittingGrade(true);
    setTimeout(() => {
      gradeSubmission(subToGrade.id, gradeData, feedback);
      toast.success('Submission graded successfully!');
      setSelectedSub(null);
      setSubmittingGrade(false);
    }, 400);
  };

  const pendingCount = allSubs.filter(submission => submission.status === 'submitted').length;
  const scopedPendingCount = scopedSubs.filter(submission => submission.status === 'submitted').length;
  const totalScore = Object.values(gradeInputs).reduce((sum, value) => sum + (value || 0), 0);

  if (!currentUser) return null;

  return (
    <>
      {selectedSub && subToGrade && subExam && student ? (
        <GradeSubmissionView
          submission={subToGrade}
          exam={subExam}
          student={student}
          gradeInputs={gradeInputs}
          feedback={feedback}
          totalScore={totalScore}
          submittingGrade={submittingGrade}
          onBack={() => setSelectedSub(null)}
          onOpenViolations={() => openViolations(subExam.id, subToGrade.studentId, subExam.title, student.name)}
          onGradeInputChange={(questionId, value, maxMarks) => {
            setGradeInputs(current => ({
              ...current,
              [questionId]: Math.min(value, maxMarks),
            }));
          }}
          onFeedbackChange={setFeedback}
          onSubmit={handleGradeSubmit}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Grade Exams</h1>
            <p className="text-gray-400 mt-0.5 text-sm">Review and grade student submissions</p>
          </div>

          <GradeFilterTabs filter={filter} pendingCount={pendingCount} onChange={setFilter} />

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search student, exam, class..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <ExamSelectionChips
            exams={myExams}
            classes={classes}
            selectedCourse={selectedCourse}
            selectedExam={selectedExam}
            onToggleCourse={setSelectedCourse}
            onToggleExam={setSelectedExam}
          />

          <SubmissionsTable
            submissions={examSubs}
            exams={myExams}
            getUserById={getUserById}
            pendingCount={scopedPendingCount}
            filter={filter}
            onOpenViolations={openViolations}
            onOpenGrade={openGrade}
          />
        </div>
      )}

      <SubmissionViolationsModal
        modalState={violationsModal}
        violations={violations}
        loading={violationsLoading}
        onClose={closeViolations}
      />
    </>
  );
}
