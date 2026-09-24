import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Send,
  Flag,
  BookOpen,
  BarChart2,
  Save,
  ShieldAlert,
  UserCog,
} from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { Answer, QuestionTelemetry } from '../../data/types';
import { ConfirmDialog } from '@/widgets/layouts/Modal';
import { toast } from 'sonner';
import { violationApi, ViolationType } from '../../services/api';
import {
  createExamFocusViolationState as CreateExamFocusViolationState,
  resolveExamFocusViolation as ResolveExamFocusViolation,
} from '../../features/student/take-exam/lib/focus-violation-state';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];
const MAX_TAB_SWITCHES = 3;

type ActiveQuestionSession = {
  questionId: string;
  startedAt: number;
};

export function TakeExam() {
  const { examId } = useParams<{ examId: string }>();
  const { currentUser, getExamById, getStudentSubmission, submitExam, getClassById } = useApp();
  const navigate = useNavigate();

  const exam = examId ? getExamById(examId) : null;
  const existingSub = exam && currentUser ? getStudentSubmission(exam.id, currentUser.id) : null;

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

  // Anti-cheat state
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [violationWarningMessage, setViolationWarningMessage] = useState<string | null>(null);
  const [autoSubmitReason, setAutoSubmitReason] = useState<string | null>(null);
  const [multipleMonitorsBlocked, setMultipleMonitorsBlocked] = useState(false);
  const [isInFullscreen, setIsInFullscreen] = useState(() => !!document.fullscreenElement);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [showWhyExplanation, setShowWhyExplanation] = useState(false);
  const tabSwitchCountRef = useRef(0);
  const examStartTimeRef = useRef<number | null>(null);
  const focusViolationStateRef = useRef(CreateExamFocusViolationState());
  const VIOLATION_COOLDOWN_MS = 3_000; // 3 s grace period after exam starts
  // i think this can be reduced to just 3 seconds tho.
  // there.


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
    if (!currentUser) { navigate('/'); return; }
    if (!exam) { navigate('/student/exams'); return; }
  }, [exam, currentUser, navigate]);

  // Track fullscreen state for both start screen gating and the in-exam restore banner
  useEffect(() => {
    const handleFsChange = () => setIsInFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Anti-cheat: detect tab switching and window blur
  useEffect(() => {
    if (!started || submitted) return;

    // Record when the exam actually started so the cooldown is relative to it
    examStartTimeRef.current = Date.now();
    focusViolationStateRef.current = CreateExamFocusViolationState();

    const handleViolation = (type: ViolationType = 'tab_switch') => {
      // Ignore events fired within the first 10 s (e.g. window blur from clicking Start)
      if (examStartTimeRef.current !== null && Date.now() - examStartTimeRef.current < VIOLATION_COOLDOWN_MS) {
        return;
      }
      tabSwitchCountRef.current += 1;
      const count = tabSwitchCountRef.current;
      setTabSwitchCount(count);

      // Report to backend (fire-and-forget; do not block the UI)
      if (examId) {
        violationApi
          .report(examId, type, `Violation #${count} detected during exam`)
          .catch(() => { /* fail-open */ });
      }

      if (count >= MAX_TAB_SWITCHES) {
        setAutoSubmitReason(
          `Your exam has been automatically submitted because you left the exam window ${MAX_TAB_SWITCHES} time(s).`
        );
      } else {
        const messages: Record<string, string> = {
          fullscreen_exit: 'You exited full-screen mode. You must remain in full-screen while taking the exam.',
          tab_switch: 'You left the exam window.',
          window_blur: 'You left the exam window.',
          multiple_monitors: 'An external monitor was detected. You must use only a single display during the exam.',
          screen_overlay: 'A screen overlay or floating window was detected. Close all overlays, screen-sharing tools, and call windows before continuing.',
        };
        setViolationWarningMessage(messages[type] ?? 'A security violation was detected.');
        setShowViolationWarning(true);
      }
    };

    const applyFocusViolationEvent = (event: { type: 'blur' | 'focus' | 'visibilitychange'; hidden: boolean }) => {
      const outcome = ResolveExamFocusViolation(focusViolationStateRef.current, event);
      focusViolationStateRef.current = outcome.nextState;

      if (outcome.violationType) {
        handleViolation(outcome.violationType);
      }
    };

    const handleVisibilityChange = () => {
      applyFocusViolationEvent({ type: 'visibilitychange', hidden: document.hidden });
    };

    const handleBlur = () => {
      applyFocusViolationEvent({ type: 'blur', hidden: document.hidden });
    };

    const handleFocus = () => {
      applyFocusViolationEvent({ type: 'focus', hidden: document.hidden });
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation('right_click');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common cheating shortcuts
      if (
        (e.ctrlKey && ['c', 'v', 'a', 'u', 's', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleViolation('fullscreen_exit');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Picture-in-Picture detection: fires when a media element on this page enters PiP
    // (e.g. a student opens a video reference via PiP, or a call overlay requests PiP).
    const handlePipEnter = () => handleViolation('screen_overlay');
    document.addEventListener('enterpictureinpicture', handlePipEnter);

    // Document Picture-in-Picture API (Chrome 116+): catches floating document windows
    // created by apps like Google Meet when they call documentPictureInPicture.requestWindow().
    const docPip = (window as Window & { documentPictureInPicture?: EventTarget }).documentPictureInPicture;
    if (docPip) {
      docPip.addEventListener('enter', handlePipEnter);
    }

    // Polling every 2 s: multi-monitor + PiP element state.
    // Separate fired-flags so each re-plug / re-open counts as a fresh violation.
    let monitorViolationFired = false;
    let pipViolationFired = false;
    const monitorPollInterval = setInterval(() => {
      // Multi-monitor check (screen.isExtended — Window Management API, Chromium 100+)
      const isExtended = (window.screen as Screen & { isExtended?: boolean }).isExtended;
      if (isExtended === true && !monitorViolationFired) {
        monitorViolationFired = true;
        handleViolation('multiple_monitors');
      } else if (isExtended !== true) {
        monitorViolationFired = false;
      }

      // PiP element state check (belt-and-suspenders alongside the event listener)
      if (document.pictureInPictureElement && !pipViolationFired) {
        pipViolationFired = true;
        handleViolation('screen_overlay');
      } else if (!document.pictureInPictureElement) {
        pipViolationFired = false;
      }
    }, 2_000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('enterpictureinpicture', handlePipEnter);
      if (docPip) docPip.removeEventListener('enter', handlePipEnter);
      clearInterval(monitorPollInterval);
    };
  }, [started, submitted]);

  // Auto-submit when max violations reached
  useEffect(() => {
    if (autoSubmitReason && !submitted) {
      if (examId) {
        violationApi
          .report(examId, 'auto_submitted', `Exam auto-submitted after ${MAX_TAB_SWITCHES} violations`)
          .catch(() => { /* fail-open */ });
      }
      handleSubmit();
    }
  }, [autoSubmitReason, submitted]);

  // Auto-save simulation
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
    if (timeLeft <= 0) { handleSubmit(); return; }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [started, timeLeft, submitted]);

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
    if (!exam || !currentUser) return;
    finalizeActiveQuestionSession();

    const answerList: Answer[] = exam.questions.map(q => ({
      questionId: q.id,
      answer: answersRef.current[q.id] || '',
    }));
    const questionTelemetry: QuestionTelemetry[] = exam.questions.map(q => {
      const metric = questionTelemetryRef.current[q.id];
      return {
        questionId: q.id,
        topic: metric?.topic ?? q.topic ?? null,
        timeSpentSeconds: metric?.timeSpentSeconds ?? 0,
        visitCount: metric?.visitCount ?? 0,
        answerChangeCount: metric?.answerChangeCount ?? 0,
      };
    });

    submitExam({
      examId: exam.id,
      studentId: currentUser.id,
      answers: answerList,
      questionTelemetry,
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    });
    setSubmitted(true);
    toast.success('Exam submitted successfully!');

    // Exit fullscreen on submission
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { /* ignore */ });
    }
  }, [exam, currentUser, finalizeActiveQuestionSession, submitExam]);

  const toggleFlag = (qId: string) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  };

  if (!exam || !currentUser) return null;

  const cls = getClassById(exam.classId);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const answeredCount = exam.questions.filter(q => answers[q.id]?.trim()).length;
  const flaggedCount = flagged.size;
  const isAnswered = (qId: string) => !!answers[qId]?.trim();
  const isFlagged = (qId: string) => flagged.has(qId);
  const isUrgent = timeLeft < 300;
  const isVeryUrgent = timeLeft < 60;
  const progressPct = Math.round((answeredCount / exam.questions.length) * 100);

  //  Submitted / Already submitted screen 
  if (submitted || existingSub) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-9 h-9 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {existingSub && !submitted ? 'Already Submitted' : 'Exam Submitted!'}
          </h2>
          <p className="text-gray-500 mb-2 text-sm">{exam.title}</p>
          {existingSub?.status === 'graded' ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 my-5">
              <div className="text-2xl font-bold text-gray-900">{existingSub.grade}</div>
              <div className="text-gray-500 text-sm mt-1">{existingSub.totalScore}/{exam.totalMarks} marks · {existingSub.percentage}%</div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 my-5 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <p className="text-gray-600 text-sm text-left">Awaiting grading by your teacher.</p>
            </div>
          )}
          <button
            onClick={() => navigate('/student/exams')}
            className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Back to Exams
          </button>
          <button
            onClick={() => navigate('/student/results')}
            className="w-full mt-2 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  //  Start screen 
  if (!started) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-lg w-full shadow-sm">
          <div className="mb-6">
            <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">{cls?.name}</div>
            <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">{exam.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: 'Duration', value: `${exam.duration + (exam.extraTimeMinutes ?? 0)} min${(exam.extraTimeMinutes ?? 0) > 0 ? ` (+${exam.extraTimeMinutes})` : ''}` },
              { label: 'Total Marks', value: exam.totalMarks },
              { label: 'Questions', value: exam.questions.length },
              { label: 'Pass Mark', value: exam.passingMarks },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                <div className="text-sm font-bold text-gray-900">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Accommodation info */}
          {((exam.extraTimeMinutes ?? 0) > 0 || (exam.attemptLimit ?? 1) > 1 || exam.effectiveStartDate || (exam.accessibilityPreferences ?? []).length > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3 flex items-start gap-3">
              <UserCog className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-1">Accommodations Applied</p>
                <ul className="text-sm text-blue-700 space-y-0.5">
                  {(exam.extraTimeMinutes ?? 0) > 0 && (
                    <li>+{exam.extraTimeMinutes} min extra time (effective duration: {exam.duration + (exam.extraTimeMinutes ?? 0)} min)</li>
                  )}
                  {(exam.attemptLimit ?? 1) > 1 && (
                    <li>Up to {exam.attemptLimit} attempts ({exam.attemptsUsed ?? 0} used)</li>
                  )}
                  {exam.effectiveStartDate && exam.effectiveEndDate && (
                    <li>Alternate window: {new Date(exam.effectiveStartDate).toLocaleString()} – {new Date(exam.effectiveEndDate).toLocaleString()}</li>
                  )}
                  {(exam.accessibilityPreferences ?? []).map(p => (
                    <li key={p}>{p.replace(/_/g, ' ')}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-600 leading-relaxed">
              <strong className="text-gray-900">Important:</strong> Once started, the timer cannot be paused. Ensure you have a stable connection and enough time before beginning.
            </div>
          </div>

          {/* Anti-cheat policy + why explanation */}
          <div className="border border-red-200 rounded-xl mb-4 overflow-hidden">
            <div className="bg-red-50 p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-red-700 leading-relaxed">
                  <strong className="text-red-900">Anti-Cheat Policy:</strong> Switching tabs, minimising the window, exiting full-screen, or leaving this page will be recorded as a violation. After {MAX_TAB_SWITCHES} violation(s) your exam will be automatically submitted. You must use a <strong className="text-red-900">single monitor</strong> and remain in <strong className="text-red-900">full-screen mode</strong> for the entire exam.
                </div>
                <button
                  type="button"
                  onClick={() => setShowWhyExplanation(v => !v)}
                  className="mt-2 text-xs font-semibold text-red-600 hover:text-red-800 underline underline-offset-2 transition-colors"
                >
                  {showWhyExplanation ? 'Hide explanation ▲' : 'Why is this required? ▼'}
                </button>
              </div>
            </div>
            {showWhyExplanation && (
              <div className="bg-white border-t border-red-100 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Why these restrictions exist</p>
                <ul className="text-sm text-gray-600 space-y-1.5 list-none">
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span><span><strong className="text-gray-800">Full-screen mode</strong> prevents you from switching to other applications or browser tabs that could give an unfair advantage.</span></li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span><span><strong className="text-gray-800">Single monitor</strong> requirement prevents a secondary screen from displaying reference material during the exam.</span></li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span><span><strong className="text-gray-800">Violation tracking</strong> ensures academic integrity. All detected violations are reported to your teacher for review.</span></li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">▸</span><span><strong className="text-gray-800">Auto-submission</strong> on repeated violations protects other students from unfair grading curves.</span></li>
                </ul>
                <p className="text-xs text-gray-400 pt-1">These measures are mandated by your institution's academic integrity policy.</p>
              </div>
            )}
          </div>

          {/* Acknowledgement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none mb-5 group">
            <input
              type="checkbox"
              checked={agreedToPolicy}
              onChange={e => setAgreedToPolicy(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-gray-900 flex-shrink-0 cursor-pointer"
            />
            <span className="text-sm text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
              I understand and agree to comply with the anti-cheat policy. I acknowledge that violations will be recorded and reported to my teacher.
            </span>
          </label>

          {multipleMonitorsBlocked && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 leading-relaxed">
                <strong>Multiple monitors detected.</strong> You must disconnect all secondary monitors and use only a single display before starting the exam.
              </div>
            </div>
          )}

          {!isInFullscreen && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 mb-4 flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 leading-relaxed">
                  <strong>Full-screen required.</strong> You must enter full-screen mode before starting the exam.
                </div>
              </div>
              <button
                onClick={() => document.documentElement.requestFullscreen().catch(() => {})}
                className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
              >
                Enter Full Screen
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/student/exams')}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Block if multiple monitors detected.
                // screen.isExtended is part of the Window Management API (Chrome 100+)
                // and returns true when the device spans more than one screen.
                const extScreen = window.screen as Screen & { isExtended?: boolean };
                if (extScreen.isExtended === true) {
                  setMultipleMonitorsBlocked(true);
                  return;
                }

                answersRef.current = {};
                questionTelemetryRef.current = {};
                activeQuestionSessionRef.current = null;
                setAnswers({});
                setQuestionTelemetry({});
                setCurrentQ(0);
                setStarted(true);
                setTimeLeft((exam.duration + (exam.extraTimeMinutes ?? 0)) * 60);
              }}
              disabled={!isInFullscreen || !agreedToPolicy}
              title={!isInFullscreen ? 'Enter full-screen mode first' : !agreedToPolicy ? 'You must agree to the anti-cheat policy' : undefined}
              className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  //  Active exam 
  const question = exam.questions[currentQ];
  const wordCount = (answers[question.id] || '').trim().split(/\s+/).filter(Boolean).length;
  const charCount = (answers[question.id] || '').length;

  const getQButtonClass = (i: number, qId: string) => {
    const base = 'w-9 h-9 text-xs font-semibold rounded-lg transition-colors relative ';
    if (currentQ === i) return base + 'bg-gray-900 text-white';
    if (isAnswered(qId) && isFlagged(qId)) return base + 'bg-gray-300 text-gray-700 ring-2 ring-gray-500 ring-offset-1';
    if (isAnswered(qId)) return base + 'bg-gray-200 text-gray-700';
    if (isFlagged(qId)) return base + 'bg-white text-gray-600 border-2 border-gray-400';
    return base + 'bg-gray-100 text-gray-500 hover:bg-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/*  Violation Warning Overlay  */}
      {showViolationWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full mx-4 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-9 h-9 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Security Violation Detected!</h2>
            <p className="text-gray-600 text-sm mb-1">
              {violationWarningMessage ?? 'You left the exam window. This has been recorded as a violation.'}
            </p>
            <p className="text-red-600 text-sm font-semibold mb-6">
              Violation {tabSwitchCount} of {MAX_TAB_SWITCHES} &mdash; your exam will be auto-submitted on violation {MAX_TAB_SWITCHES}.
            </p>
            <button
              onClick={() => {
                setShowViolationWarning(false);
                document.documentElement.requestFullscreen().catch(() => {});
              }}
              className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              I Understand &mdash; Return to Exam
            </button>
          </div>
        </div>
      )}

      {/*  Auto-Submit Notification  */}
      {autoSubmitReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-red-300 p-8 max-w-md w-full mx-4 shadow-xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-9 h-9 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Exam Auto-Submitted</h2>
            <p className="text-gray-600 text-sm">{autoSubmitReason}</p>
          </div>
        </div>
      )}

      {/* Fullscreen restore banner (shown when student manages to leave fullscreen and the violation modal is not open) */}
      {started && !isInFullscreen && !showViolationWarning && !autoSubmitReason && (
        <div className="fixed top-0 inset-x-0 z-40 bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            You are no longer in full-screen mode. Return to full-screen to continue your exam.
          </div>
          <button
            onClick={() => document.documentElement.requestFullscreen().catch(() => {})}
            className="flex-shrink-0 bg-white text-amber-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors"
          >
            Restore Full Screen
          </button>
        </div>
      )}

      {/*  Top Header  */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gray-900 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="px-4 py-3 flex items-center justify-between gap-4">
          {/* Exam info */}
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{exam.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">{cls?.name}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">{answeredCount}/{exam.questions.length} answered</span>
              {flaggedCount > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs text-gray-500">{flaggedCount} flagged</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Violation badge */}
            {tabSwitchCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{tabSwitchCount}/{MAX_TAB_SWITCHES} violations</span>
              </div>
            )}

            {/* Auto-save indicator */}
            {lastSaved && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                <Save className="w-3 h-3" />
                <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}

            {/* Timer */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-sm font-bold transition-all ${
                isVeryUrgent
                  ? 'bg-gray-900 text-white animate-pulse'
                  : isUrgent
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              {formatTime(timeLeft)}
            </div>

            {/* Submit */}
            <button
              onClick={() => setShowConfirm(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Submit
            </button>
          </div>
        </div>
      </div>

      {/*  Body  */}
      <div className="flex flex-1 overflow-hidden">

        {/*  Left sidebar: Question Navigator  */}
        <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <BookOpen className="w-3.5 h-3.5" />
              Questions
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {exam.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQ(i)}
                  title={`Question ${i + 1}${isAnswered(q.id) ? ' (answered)' : ''}${isFlagged(q.id) ? ' (flagged)' : ''}`}
                  className={getQButtonClass(i, q.id)}
                >
                  {i + 1}
                  {isFlagged(q.id) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gray-500 rounded-full border border-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Legend</div>
            {[
              { swatch: 'bg-gray-900', label: 'Current' },
              { swatch: 'bg-gray-200', label: 'Answered' },
              { swatch: 'bg-white border-2 border-gray-400', label: 'Flagged' },
              { swatch: 'bg-gray-100 border border-gray-200', label: 'Unanswered' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${item.swatch} flex-shrink-0`} />
                <span className="text-xs text-gray-500">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-auto p-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <BarChart2 className="w-3.5 h-3.5" />
              Progress
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Answered</span>
                <span className="font-semibold text-gray-900">{answeredCount}/{exam.questions.length}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-gray-900 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Unanswered</span>
                <span className="font-semibold text-gray-900">{exam.questions.length - answeredCount}</span>
              </div>
            </div>
          </div>
        </aside>

        {/*  Main: Question Content  */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Question Card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Card header */}
              <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                    Q{currentQ + 1} of {exam.questions.length}
                  </span>
                  <span className="text-xs text-gray-400 capitalize bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
                    {question.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-semibold bg-gray-900 text-white px-2.5 py-1 rounded-lg">
                    {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                  </span>
                </div>
                <button
                  onClick={() => toggleFlag(question.id)}
                  title={isFlagged(question.id) ? 'Remove flag' : 'Flag for review'}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                    isFlagged(question.id)
                      ? 'bg-gray-900 text-white'
                      : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isFlagged(question.id) ? 'Flagged' : 'Flag'}</span>
                </button>
              </div>

              {/* Question body */}
              <div className="px-6 py-5">
                <p className="text-gray-900 text-base leading-relaxed mb-5 font-medium">{question.text}</p>

                {/* MCQ */}
                {question.type === 'mcq' && question.options && (
                  <div className="space-y-2.5">
                    {question.options.map((opt, i) => {
                      const selected = answers[question.id] === opt;
                      return (
                        <label
                          key={i}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                            selected
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            className="sr-only"
                            checked={selected}
                            onChange={() => updateAnswerValue(question.id, opt)}
                          />
                          {/* Letter badge */}
                          <div
                            className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                              selected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {OPTION_LETTERS[i]}
                          </div>
                          <span className={`text-sm leading-relaxed ${selected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                            {opt}
                          </span>
                          {selected && (
                            <CheckCircle2 className="w-4 h-4 text-gray-900 ml-auto flex-shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Short Answer */}
                {question.type === 'short_answer' && (
                  <div>
                    <textarea
                      rows={4}
                      placeholder="Type your answer here..."
                      value={answers[question.id] || ''}
                      onChange={e => updateAnswerValue(question.id, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none transition-shadow leading-relaxed"
                    />
                    <div className="flex justify-end mt-1.5 gap-3 text-xs text-gray-400">
                      <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                      <span>{charCount} {charCount === 1 ? 'char' : 'chars'}</span>
                    </div>
                  </div>
                )}

                {/* Essay */}
                {question.type === 'essay' && (
                  <div>
                    <textarea
                      rows={10}
                      placeholder="Write your detailed answer here..."
                      value={answers[question.id] || ''}
                      onChange={e => updateAnswerValue(question.id, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none transition-shadow leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
                      <span className="italic">Tip: Write clearly and structure your answer with key points.</span>
                      <div className="flex gap-3">
                        <span>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                        <span>{charCount} chars</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation row */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setCurrentQ(prev => Math.max(0, prev - 1))}
                disabled={currentQ === 0}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              {/* Mobile dot progress */}
              <div className="md:hidden flex gap-1 overflow-x-auto max-w-[120px]">
                {exam.questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQ(i)}
                    className={`flex-shrink-0 w-2 h-2 rounded-full transition-colors ${
                      currentQ === i ? 'bg-gray-900' : isAnswered(q.id) ? 'bg-gray-400' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {currentQ < exam.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQ(prev => Math.min(exam.questions.length - 1, prev + 1))}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Submit Exam
                </button>
              )}
            </div>

            {/* Mobile submit bar */}
            <button
              onClick={() => setShowConfirm(true)}
              className="sm:hidden w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Submit Exam ({answeredCount}/{exam.questions.length} answered)
            </button>

            {/* Mobile auto-save */}
            {lastSaved && (
              <div className="sm:hidden flex items-center justify-center gap-1.5 text-xs text-gray-400 pb-2">
                <Save className="w-3 h-3" />
                Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        title="Submit Exam"
        message={`You have answered ${answeredCount} of ${exam.questions.length} questions. ${
          answeredCount < exam.questions.length
            ? `${exam.questions.length - answeredCount} unanswered question(s) will receive 0 marks. `
            : ''
        }${flaggedCount > 0 ? `You also have ${flaggedCount} flagged question(s). ` : ''}Are you sure you want to submit?`}
        confirmLabel="Submit Exam"
        confirmVariant="primary"
      />
    </div>
  );
}
