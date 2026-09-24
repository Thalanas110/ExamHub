import { useEffect, useRef, useState } from 'react';
import { violationApi, type ViolationType } from '@/entities/violation';
import { MAX_TAB_SWITCHES, VIOLATION_COOLDOWN_MS } from '../constants';
import { createExamFocusViolationState, resolveExamFocusViolation } from '../lib/focus-violation-state';

interface UseExamAntiCheatParams {
  examId?: string;
  started: boolean;
  submitted: boolean;
  onAutoSubmit: () => void;
}

export function useExamAntiCheat({
  examId,
  started,
  submitted,
  onAutoSubmit,
}: UseExamAntiCheatParams) {
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [autoSubmitReason, setAutoSubmitReason] = useState<string | null>(null);
  const tabSwitchCountRef = useRef(0);
  const examStartTimeRef = useRef<number | null>(null);
  const focusViolationStateRef = useRef(createExamFocusViolationState());

  useEffect(() => {
    if (!started || submitted) return;

    examStartTimeRef.current = Date.now();
    focusViolationStateRef.current = createExamFocusViolationState();

    const handleViolation = (type: ViolationType = 'tab_switch') => {
      if (examStartTimeRef.current !== null && Date.now() - examStartTimeRef.current < VIOLATION_COOLDOWN_MS) {
        return;
      }

      tabSwitchCountRef.current += 1;
      const count = tabSwitchCountRef.current;
      setTabSwitchCount(count);

      if (examId) {
        violationApi
          .report(examId, type, `Violation #${count} detected during exam`)
          .catch(() => {});
      }

      if (count >= MAX_TAB_SWITCHES) {
        setAutoSubmitReason(
          `Your exam has been automatically submitted because you left the exam window ${MAX_TAB_SWITCHES} time(s).`
        );
      } else {
        setShowViolationWarning(true);
      }
    };

    const applyFocusViolationEvent = (event: { type: 'blur' | 'focus' | 'visibilitychange'; hidden: boolean }) => {
      const outcome = resolveExamFocusViolation(focusViolationStateRef.current, event);
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

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      handleViolation('right_click');
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey && ['c', 'v', 'a', 'u', 's', 'p'].includes(event.key.toLowerCase())) ||
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(event.key.toLowerCase())) ||
        (event.altKey && event.key === 'Tab')
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [examId, started, submitted]);

  useEffect(() => {
    if (!autoSubmitReason || submitted) return;

    if (examId) {
      violationApi
        .report(examId, 'auto_submitted', `Exam auto-submitted after ${MAX_TAB_SWITCHES} violations`)
        .catch(() => {});
    }

    onAutoSubmit();
  }, [autoSubmitReason, examId, submitted, onAutoSubmit]);

  return {
    tabSwitchCount,
    showViolationWarning,
    autoSubmitReason,
    dismissViolationWarning: () => setShowViolationWarning(false),
  };
}
