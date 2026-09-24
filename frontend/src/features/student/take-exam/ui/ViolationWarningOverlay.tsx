import { ShieldAlert } from 'lucide-react';
import { MAX_TAB_SWITCHES } from '../model/constants';

interface ViolationWarningOverlayProps {
  isOpen: boolean;
  violationCount: number;
  onClose: () => void;
}

export function ViolationWarningOverlay({
  isOpen,
  violationCount,
  onClose,
}: ViolationWarningOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md w-full mx-4 shadow-xl text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-9 h-9 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tab Switch Detected!</h2>
        <p className="text-gray-600 text-sm mb-1">
          You left the exam window. This has been recorded as a violation.
        </p>
        <p className="text-red-600 text-sm font-semibold mb-6">
          Violation {violationCount} of {MAX_TAB_SWITCHES} &mdash; your exam will be auto-submitted on violation {MAX_TAB_SWITCHES}.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          I Understand &mdash; Return to Exam
        </button>
      </div>
    </div>
  );
}
