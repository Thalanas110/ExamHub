import { FileText } from 'lucide-react';

interface EmptyExamsStateProps {
  onCreate: () => void;
}

export function EmptyExamsState({ onCreate }: EmptyExamsStateProps) {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
      <div className="text-gray-500 font-medium">No exams found</div>
      <div className="text-gray-400 text-sm mt-1">Create your first exam to get started</div>
      <button onClick={onCreate} className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700">
        Create Exam
      </button>
    </div>
  );
}
