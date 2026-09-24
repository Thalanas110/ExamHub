import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Class } from '@/entities/class';
import type { Exam } from '@/entities/exam';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

interface ExamSelectionChipsProps {
  exams: Exam[];
  classes: Class[];
  selectedCourse: string | null;
  selectedExam: string | null;
  onToggleCourse: (courseId: string | null) => void;
  onToggleExam: (examId: string | null) => void;
}

export function ExamSelectionChips({
  exams,
  classes,
  selectedCourse,
  selectedExam,
  onToggleCourse,
  onToggleExam,
}: ExamSelectionChipsProps) {
  const [query, setQuery] = useState('');

  const classLookup = useMemo(
    () => new Map(classes.map(classItem => [classItem.id, classItem])),
    [classes],
  );

  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();

    for (const exam of exams) {
      const className = classLookup.get(exam.classId)?.name ?? 'Unknown Course';
      if (!seen.has(exam.classId)) {
        seen.set(exam.classId, className);
      }
    }

    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [classLookup, exams]);

  const normalizedQuery = query.trim().toLowerCase();
  const scopedExams = useMemo(
    () => exams.filter(exam => (selectedCourse ? exam.classId === selectedCourse : true)),
    [exams, selectedCourse],
  );
  const filteredExams = useMemo(
    () => scopedExams.filter(exam => (normalizedQuery ? exam.title.toLowerCase().includes(normalizedQuery) : true)),
    [normalizedQuery, scopedExams],
  );

  const selectedExamEntity = exams.find(exam => exam.id === selectedExam);
  const selectOptions = selectedExamEntity && !filteredExams.some(exam => exam.id === selectedExamEntity.id)
    ? [selectedExamEntity, ...filteredExams]
    : filteredExams;

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Submission Scope</div>
        <div className="text-xs text-gray-500">
          {filteredExams.length} of {scopedExams.length} exams
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Select value={selectedCourse ?? '__all__'} onValueChange={value => onToggleCourse(value === '__all__' ? null : value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Courses</SelectItem>
            {courseOptions.map(option => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search exam title..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center">
        <Select value={selectedExam ?? '__all__'} onValueChange={value => onToggleExam(value === '__all__' ? null : value)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All Exams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Exams</SelectItem>
            {selectOptions.map(exam => (
              <SelectItem key={exam.id} value={exam.id}>
                {exam.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>
    </section>
  );
}
