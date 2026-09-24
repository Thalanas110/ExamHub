import type { TeacherExamFilter } from '../constants';
import { TEACHER_EXAM_FILTERS } from '../constants';

interface ExamFilterTabsProps {
  filter: TeacherExamFilter;
  onChange: (filter: TeacherExamFilter) => void;
}

export function ExamFilterTabs({ filter, onChange }: ExamFilterTabsProps) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      {TEACHER_EXAM_FILTERS.map(value => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
            filter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
