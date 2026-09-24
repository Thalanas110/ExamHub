import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { AppContextType } from '@/app/providers/app-context.types';
import type { Answer, Exam, QuestionTelemetry } from '../../../../data/types';

type ActiveQuestionSession = {
  questionId: string;
  startedAt: number;
};

interface UseExamSessionParams {
  exam: Exam | null;
  studentId?: string;
  submitExam: AppContextType['submitExam'];
}

export function useExamSession({
  exam,
  studentId,
  submitExam,
}: UseExamSessionParams) {
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(exam ? (exam.duration + (exam.extraTimeMinutes ?? 0)) * 60 : 0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setQuestionTelemetry] = useState<Record<string, QuestionTelemetry>>({});
  const questionTelemetryRef = useRef<Record<string, QuestionTelemetry>>({});
  const answersRef = useRef<Record<string, string>>({});
  const activeQuestionSessionRef = useRef<ActiveQuestionSession | null>(null);

  const updateQuestionTelemetry = useCallback((
    questionId: string,
    topic: string | null | undefined,
    updater: (current: QuestionTelemetry) => QuestionTelemetry,
  ) => {
    const currentTelemetry = questionTelemetryRef.current;
    const current = currentTelemetry[questionId] ?? {
      questionId,
      topic: topic ?? null,
      timeSpentSeconds: 0,
      visitCount: 0,
      answerChangeCount: 0,
    };
    const nextEntry = updater(current);
    const next = {
      ...currentTelemetry,
      [questionId]: {
        ...nextEntry,
        questionId,
        topic: nextEntry.topic ?? topic ?? null,
      },
    };
    questionTelemetryRef.current = next;
    setQuestionTelemetry(next);
  }, []);

  const finalizeActiveQuestionSession = useCallback(() => {
    const activeSession = activeQuestionSessionRef.current;
    if (!activeSession || !exam) return;

    const question = exam.questions.find(item => item.id === activeSession.questionId);
    const elapsedSeconds = Math.max(0, Math.round((Date.now() - activeSession.startedAt) / 1000));

    updateQuestionTelemetry(activeSession.questionId, question?.topic ?? null, current => ({
      ...current,
      timeSpentSeconds: current.timeSpentSeconds + elapsedSeconds,
    }));

    activeQuestionSessionRef.current = null;
  }, [exam, updateQuestionTelemetry]);

  const startQuestionSession = useCallback((questionId: string) => {
    if (!exam) return;

    const question = exam.questions.find(item => item.id === questionId);
    activeQuestionSessionRef.current = {
      questionId,
      startedAt: Date.now(),
    };

    updateQuestionTelemetry(questionId, question?.topic ?? null, current => ({
      ...current,
      visitCount: current.visitCount + 1,
    }));
  }, [exam, updateQuestionTelemetry]);

  const updateAnswerValue = useCallback((questionId: string, value: string) => {
    const currentValue = answersRef.current[questionId] ?? '';
    if (currentValue === value) return;

    const nextAnswers = {
      ...answersRef.current,
      [questionId]: value,
    };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);

    const question = exam?.questions.find(item => item.id === questionId);
    updateQuestionTelemetry(questionId, question?.topic ?? null, current => ({
      ...current,
      answerChangeCount: current.answerChangeCount + 1,
    }));
  }, [exam, updateQuestionTelemetry]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!started || submitted) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      setLastSaved(new Date());
    }, 1500);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [answers, started, submitted]);

  useEffect(() => {
    if (!started || submitted || !exam) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(current => current - 1), 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft, submitted, exam]);

  useEffect(() => {
    if (!started || submitted || !exam) return;

    const activeQuestionId = exam.questions[currentQ]?.id;
    if (!activeQuestionId) return;

    startQuestionSession(activeQuestionId);

    return () => {
      finalizeActiveQuestionSession();
    };
  }, [started, submitted, exam, currentQ, startQuestionSession, finalizeActiveQuestionSession]);

  const handleSubmit = useCallback(() => {
    if (!exam || !studentId) return;
    finalizeActiveQuestionSession();

    const answerList: Answer[] = exam.questions.map(question => ({
      questionId: question.id,
      answer: answersRef.current[question.id] || '',
    }));
    const questionTelemetry: QuestionTelemetry[] = exam.questions.map(question => {
      const metric = questionTelemetryRef.current[question.id];
      return {
        questionId: question.id,
        topic: metric?.topic ?? question.topic ?? null,
        timeSpentSeconds: metric?.timeSpentSeconds ?? 0,
        visitCount: metric?.visitCount ?? 0,
        answerChangeCount: metric?.answerChangeCount ?? 0,
      };
    });

    submitExam({
      examId: exam.id,
      studentId,
      answers: answerList,
      questionTelemetry,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    });
    setSubmitted(true);
    toast.success('Exam submitted successfully!');
  }, [exam, studentId, finalizeActiveQuestionSession, submitExam]);

  const startExam = useCallback(() => {
    if (!exam) return;

    answersRef.current = {};
    questionTelemetryRef.current = {};
    activeQuestionSessionRef.current = null;
    setAnswers({});
    setQuestionTelemetry({});
    setFlagged(new Set());
    setCurrentQ(0);
    setStarted(true);
    setTimeLeft((exam.duration + (exam.extraTimeMinutes ?? 0)) * 60);
  }, [exam]);

  const toggleFlag = useCallback((questionId: string) => {
    setFlagged(current => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const answeredCount = exam ? exam.questions.filter(question => answers[question.id]?.trim()).length : 0;
  const flaggedCount = flagged.size;
  const isAnswered = (questionId: string) => !!answers[questionId]?.trim();
  const isFlagged = (questionId: string) => flagged.has(questionId);
  const progressPct = exam ? Math.round((answeredCount / exam.questions.length) * 100) : 0;
  const isUrgent = timeLeft < 300;
  const isVeryUrgent = timeLeft < 60;
  const currentQuestion = exam?.questions[currentQ] ?? null;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] || '' : '';
  const wordCount = currentAnswer.trim().split(/\s+/).filter(Boolean).length;
  const charCount = currentAnswer.length;

  return {
    started,
    currentQ,
    answers,
    flagged,
    timeLeft,
    showConfirm,
    submitted,
    lastSaved,
    answeredCount,
    flaggedCount,
    progressPct,
    isUrgent,
    isVeryUrgent,
    currentQuestion,
    currentAnswer,
    wordCount,
    charCount,
    setCurrentQ,
    setShowConfirm,
    startExam,
    updateAnswerValue,
    toggleFlag,
    handleSubmit,
    isAnswered,
    isFlagged,
  };
}
