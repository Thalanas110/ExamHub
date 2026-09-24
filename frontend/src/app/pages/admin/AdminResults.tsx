import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { Badge, getGradeBadge } from '@/shared/ui/Badge';
import { PaginatedTable } from '@/shared/ui/PaginatedTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export function AdminResults() {
  const { submissions, exams, users, classes, getUserById } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'graded'>('all');
  const [examFilter, setExamFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = submissions.filter(s => {
    const student = getUserById(s.studentId);
    const exam = exams.find(e => e.id === s.examId);
    const cls = exam ? classes.find(c => c.id === exam.classId) : null;
    const query = search.trim().toLowerCase();
    const matchSearch = query === ''
      || (student?.name.toLowerCase().includes(query) ?? false)
      || (student?.email.toLowerCase().includes(query) ?? false)
      || (exam?.title.toLowerCase().includes(query) ?? false)
      || (cls?.name.toLowerCase().includes(query) ?? false)
      || (s.grade?.toLowerCase().includes(query) ?? false);
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchExam = examFilter === 'all' || s.examId === examFilter;
    const matchClass = classFilter === 'all' || exam?.classId === classFilter;
    const matchGrade = gradeFilter === 'all' || s.grade === gradeFilter;
    const passed = exam !== undefined && s.status === 'graded' && (s.totalScore || 0) >= exam.passingMarks;
    const matchOutcome = outcomeFilter === 'all'
      || (outcomeFilter === 'passed' && passed)
      || (outcomeFilter === 'failed' && s.status === 'graded' && !passed);
    return matchSearch && matchStatus && matchExam && matchClass && matchGrade && matchOutcome;
  });
  const gradeOptions = Array.from(new Set(submissions.map(s => s.grade).filter((grade): grade is string => Boolean(grade)))).sort();

  const gradedCount = submissions.filter(s => s.status === 'graded').length;
  const pendingCount = submissions.filter(s => s.status === 'submitted').length;
  const avgScore = submissions.filter(s => s.percentage !== undefined).length > 0
    ? Math.round(submissions.filter(s => s.percentage !== undefined).reduce((sum, s) => sum + (s.percentage || 0), 0) / submissions.filter(s => s.percentage !== undefined).length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Results</h1>
        <p className="text-gray-500 mt-0.5 text-sm">View all exam submissions and grades</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Submissions', value: submissions.length },
          { label: 'Graded', value: gradedCount },
          { label: 'Pending', value: pendingCount },
          { label: 'Platform Avg', value: `${avgScore}%` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['all', 'submitted', 'graded'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <Select value={examFilter} onValueChange={setExamFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Grades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {gradeOptions.map(grade => <SelectItem key={grade} value={grade}>{grade}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={value => setOutcomeFilter(value as 'all' | 'passed' | 'failed')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search student, exam, class..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <PaginatedTable
          items={filtered}
          colSpan={8}
          minWidthClassName="min-w-[1040px]"
          bodyClassName="divide-y divide-gray-100"
          header={(
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500">
                <th className="px-6 py-3 text-left font-medium">Student</th>
                <th className="px-6 py-3 text-left font-medium">Exam</th>
                <th className="px-6 py-3 text-left font-medium">Class</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Score</th>
                <th className="px-6 py-3 text-left font-medium">Grade</th>
                <th className="px-6 py-3 text-left font-medium">Submitted</th>
                <th className="px-6 py-3 text-right font-medium">Detail</th>
              </tr>
            </thead>
          )}
          emptyRow={<div className="px-6 py-12 text-center text-gray-400 text-sm">No results found</div>}
          renderRow={sub => {
              const student = getUserById(sub.studentId);
              const exam = exams.find(e => e.id === sub.examId);
              const cls = exam ? classes.find(c => c.id === exam.classId) : null;
              const initials = student?.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
              return (
                <React.Fragment key={sub.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold flex-shrink-0">{initials}</div>
                        <span className="font-medium text-gray-900">{student?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 max-w-[150px] truncate">{exam?.title || '—'}</td>
                    <td className="px-6 py-3.5 text-gray-400">{cls?.name || '—'}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={sub.status === 'graded' ? 'success' : 'warning'}>{sub.status}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      {sub.totalScore !== undefined ? (
                        <div>
                          <span className="font-semibold text-gray-900">{sub.totalScore}/{exam?.totalMarks}</span>
                          <span className="text-gray-400 ml-1 text-xs">({sub.percentage}%)</span>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-3.5">
                      {sub.grade ? <Badge variant={getGradeBadge(sub.grade)}>{sub.grade}</Badge> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-6 py-3.5 text-gray-400 text-xs">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5 text-right">
                      <button onClick={() => setExpanded(expanded === sub.id ? null : sub.id)} className="text-xs text-blue-600 font-medium hover:text-blue-700 underline">
                        {expanded === sub.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expanded === sub.id && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-blue-50">
                        <div className="text-sm font-medium text-gray-700 mb-3">Submission Details</div>
                        {sub.feedback && (
                          <div className="bg-white border border-blue-100 rounded-xl p-3 mb-3 text-sm text-blue-800">
                            <strong>Feedback:</strong> {sub.feedback}
                          </div>
                        )}
                        <div className="space-y-2">
                          {exam?.questions.map((q, i) => {
                            const ans = sub.answers.find(a => a.questionId === q.id);
                            return (
                              <div key={q.id} className="flex items-start gap-2.5 bg-white rounded-xl p-3">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold flex-shrink-0">Q{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-600 mb-1">{q.text}</div>
                                  <div className="text-xs text-gray-800 font-medium">{ans?.answer || <span className="italic text-gray-400">No answer</span>}</div>
                                </div>
                                <div className="text-xs font-semibold text-gray-600 flex-shrink-0">{ans?.marksAwarded ?? '?'}/{q.marks}</div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
          }}
        />
      </div>
    </div>
  );
}
