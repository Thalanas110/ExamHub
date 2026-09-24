import type { ViolationType } from '@/entities/violation';

export type ExamFocusViolationEvent =
  | { type: 'visibilitychange'; hidden: boolean }
  | { type: 'blur'; hidden: boolean }
  | { type: 'focus'; hidden: boolean };

export interface ExamFocusViolationState {
  pendingVisibleBlur: boolean;
}

export interface ExamFocusViolationResolution {
  nextState: ExamFocusViolationState;
  violationType: ViolationType | null;
}

export function createExamFocusViolationState(): ExamFocusViolationState {
  return {
    pendingVisibleBlur: false,
  };
}

export function resolveExamFocusViolation(
  state: ExamFocusViolationState,
  event: ExamFocusViolationEvent,
): ExamFocusViolationResolution {
  if (event.type === 'visibilitychange') {
    if (!event.hidden) {
      return {
        nextState: state,
        violationType: null,
      };
    }

    return {
      nextState: {
        ...state,
        pendingVisibleBlur: false,
      },
      violationType: 'tab_switch',
    };
  }

  if (event.type === 'blur') {
    return {
      nextState: event.hidden
        ? state
        : {
            ...state,
            pendingVisibleBlur: true,
          },
      violationType: null,
    };
  }

  if (event.hidden || !state.pendingVisibleBlur) {
    return {
      nextState: {
        ...state,
        pendingVisibleBlur: false,
      },
      violationType: null,
    };
  }

  return {
    nextState: {
      ...state,
      pendingVisibleBlur: false,
    },
    violationType: 'window_blur',
  };
}
