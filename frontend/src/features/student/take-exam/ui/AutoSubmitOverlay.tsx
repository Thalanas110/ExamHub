import { ShieldAlert } from 'lucide-react';

interface AutoSubmitOverlayProps {
  reason: string | null;
}

export function AutoSubmitOverlay({ reason }: AutoSubmitOverlayProps) {
  if (!reason) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-red-300 p-8 max-w-md w-full mx-4 shadow-xl text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-9 h-9 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Exam Auto-Submitted</h2>
        <p className="text-gray-600 text-sm">{reason}</p>
      </div>
    </div>
  );
}
