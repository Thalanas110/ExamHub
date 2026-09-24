export type GradeFilter = 'all' | 'pending' | 'graded';

interface GradeFilterTabsProps {
  filter: GradeFilter;
  pendingCount: number;
  onChange: (filter: GradeFilter) => void;
}

export function GradeFilterTabs({
  filter,
  pendingCount,
  onChange,
}: GradeFilterTabsProps) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
      {(['all', 'pending', 'graded'] as const).map(value => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
            filter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {value} {value === 'pending' ? `(${pendingCount})` : ''}
        </button>
      ))}
    </div>
  );
}
