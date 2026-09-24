import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Clock, Search, CheckCircle2, AlertCircle, BookOpen, Calendar, UserCog } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Badge, getStatusBadge } from '@/widgets/layouts/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

type ExamFilter = 'all' | 'available' | 'submitted' | 'graded';

type ExamFilterTab = {
  key: ExamFilter;
  label: string;
  count: number;
};

export function StudentExams() {
  const { currentUser, classes, exams, getStudentSubmission, getClassById } = useApp();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ExamFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('__all__');

  if (!currentUser) return null;

  const myClassIds = new Set(classes.filter(c => c.studentIds.includes(currentUser.id)).map(c => c.id));
  const myClasses = classes.filter(c => c.studentIds.includes(currentUser.id));
  const myExams = exams.filter(e => myClassIds.has(e.classId));

  const subjects = Array.from(new Set(myClasses.map(c => c.subject))).sort();

  const getExamState = (examId: string) => {
    const sub = getStudentSubmission(examId, currentUser.id);
    if (!sub) return 'available';
    return sub.status;
  };

  const filtered = myExams.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const cls = getClassById(e.classId);
    const matchSubject = subjectFilter === '__all__' || cls?.subject === subjectFilter;
    const state = getExamState(e.id);
    if (!matchSearch || !matchSubject) return false;
    if (filter === 'all') return true;
    if (filter === 'available') return state === 'available' && e.status === 'published';
    if (filter === 'submitted') return state === 'submitted';
    if (filter === 'graded') return state === 'graded';
    return true;
  });

  const tabs: ExamFilterTab[] = [
    { key: 'all', label: 'All Exams', count: myExams.length },
    { key: 'available', label: 'Available', count: myExams.filter(e => getExamState(e.id) === 'available' && e.status === 'published').length },
    { key: 'submitted', label: 'Submitted', count: myExams.filter(e => getExamState(e.id) === 'submitted').length },
    { key: 'graded', label: 'Graded', count: myExams.filter(e => getExamState(e.id) === 'graded').length },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
        <p className="text-gray-500 mt-0.5 text-sm">View and take exams for your enrolled classes</p>
      </div>

      {/* Mobile filter */}
      <div className="sm:hidden">
        <label htmlFor="exam-filter" className="block text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
          Filter Exams
        </label>
        <div className="mt-2">
          <Select value={filter} onValueChange={value => setFilter(value as ExamFilter)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map(tab => (
                <SelectItem key={tab.key} value={tab.key}>
                  {tab.label} ({tab.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop tabs */}
      <div className="hidden sm:flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Subject filter */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search exams..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full bg-white"
          />
        </div>
        {subjects.length > 0 && (
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-44 py-2.5 border-gray-300 bg-white rounded-xl">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Subjects</SelectItem>
              {subjects.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Exam Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="text-sm">No exams found</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(exam => {
            const cls = getClassById(exam.classId);
            const sub = getStudentSubmission(exam.id, currentUser.id);
            const state = getExamState(exam.id);
            const canTake = !sub && exam.status === 'published';

            return (
              <div key={exam.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug">{exam.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{cls?.name}</p>
                  </div>
                  <Badge variant={getStatusBadge(exam.status)} className="flex-shrink-0">
                    {exam.status}
                  </Badge>
                </div>

                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{exam.description}</p>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <div className="text-xs text-gray-400">Duration</div>
                    <div className="text-sm font-semibold text-gray-900 flex items-center justify-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      {(exam.extraTimeMinutes ?? 0) > 0
                        ? `${exam.duration + (exam.extraTimeMinutes ?? 0)} min`
                        : `${exam.duration} min`}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <div className="text-xs text-gray-400">Total Marks</div>
                    <div className="text-sm font-semibold text-gray-900 mt-0.5">{exam.totalMarks}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <div className="text-xs text-gray-400">Questions</div>
                    <div className="text-sm font-semibold text-gray-900 mt-0.5">{exam.questions.length}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <div className="text-xs text-gray-400">Pass Mark</div>
                    <div className="text-sm font-semibold text-gray-900 mt-0.5">{exam.passingMarks}</div>
                  </div>
                </div>

                {/* Accommodation banner */}
                {((exam.extraTimeMinutes ?? 0) > 0 || (exam.attemptLimit ?? 1) > 1 || exam.effectiveStartDate || (exam.accessibilityPreferences ?? []).length > 0) && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4 flex items-start gap-2">
                    <UserCog className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700 space-y-0.5">
                      {(exam.extraTimeMinutes ?? 0) > 0 && (
                        <div>+{exam.extraTimeMinutes} min extra time</div>
                      )}
                      {(exam.attemptLimit ?? 1) > 1 && (
                        <div>Up to {exam.attemptLimit} attempts ({exam.attemptsUsed ?? 0} used)</div>
                      )}
                      {exam.effectiveStartDate && exam.effectiveEndDate && (
                        <div>
                          Window: {new Date(exam.effectiveStartDate).toLocaleDateString()} {new Date(exam.effectiveStartDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(exam.effectiveEndDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {(exam.accessibilityPreferences ?? []).map(p => (
                        <div key={p}>{p.replace(/_/g, ' ')}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(exam.startDate).toLocaleDateString()} · {new Date(exam.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Result display if graded */}
                {sub?.status === 'graded' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-700 font-medium">Score: {sub.totalScore}/{exam.totalMarks} ({sub.percentage}%)</span>
                      <span className={`text-sm font-bold ${(sub.percentage || 0) >= (exam.passingMarks / exam.totalMarks * 100) ? 'text-green-700' : 'text-red-600'}`}>
                        Grade: {sub.grade}
                      </span>
                    </div>
                  </div>
                )}
                {sub?.status === 'submitted' && (
                  <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-amber-700 font-medium">Submitted – Awaiting grading</span>
                  </div>
                )}

                <div className="mt-auto">
                  {canTake ? (
                    <button
                      onClick={() => navigate(`/student/take-exam/${exam.id}`)}
                      className="w-full bg-gray-900 text-white py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
                    >
                      Start Exam
                    </button>
                  ) : sub?.status === 'graded' ? (
                    <button className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-medium border border-gray-200 cursor-default">
                      <CheckCircle2 className="w-4 h-4" /> Graded
                    </button>
                  ) : sub?.status === 'submitted' ? (
                    <button className="w-full bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-medium border border-gray-200 cursor-default">
                      Pending Review
                    </button>
                  ) : (
                    <button className="w-full bg-gray-100 text-gray-400 py-2 rounded-xl text-sm font-medium cursor-not-allowed">
                      {exam.status === 'draft' ? 'Not Published' : 'Completed'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
