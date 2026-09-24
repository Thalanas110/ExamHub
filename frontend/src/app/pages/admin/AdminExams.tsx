import React, { useState } from 'react';
import { Search, FileText, Trash2, Eye, Clock, Users, CheckSquare } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { Badge, getStatusBadge } from '@/widgets/layouts/Badge';
import { ConfirmDialog, Modal } from '@/widgets/layouts/Modal';
import { PaginatedTable } from '@/widgets/layouts/PaginatedTable';
import { ExamStatus } from '../../data/types';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export function AdminExams() {
  const { exams, classes, users, submissions, deleteExam, updateExam, getSubmissionsByExam, getUserById } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ExamStatus>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewExam, setViewExam] = useState<string | null>(null);

  const filtered = exams.filter(e => {
    const cls = classes.find(c => c.id === e.classId);
    const teacher = getUserById(e.teacherId);
    const query = search.trim().toLowerCase();
    const matchSearch = query === ''
      || e.title.toLowerCase().includes(query)
      || e.description.toLowerCase().includes(query)
      || (cls?.name.toLowerCase().includes(query) ?? false)
      || (teacher?.name.toLowerCase().includes(query) ?? false);
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchClass = classFilter === 'all' || e.classId === classFilter;
    const matchTeacher = teacherFilter === 'all' || e.teacherId === teacherFilter;
    return matchSearch && matchStatus && matchClass && matchTeacher;
  });
  const teacherOptions = users.filter(user => user.role === 'teacher');

  const handleDelete = async (id: string) => {
    try {
      await deleteExam(id);
      toast.success('Exam deleted');
    } catch (error) {
      const message = error instanceof Error && error.message.trim() !== ''
        ? error.message
        : 'Unable to delete exam.';
      toast.error(message);
    }
  };

  const handleStatusChange = async (id: string, status: ExamStatus) => {
    try {
      await updateExam(id, { status });
      toast.success(`Status changed to ${status}`);
    } catch (error) {
      const message = error instanceof Error && error.message.trim() !== ''
        ? error.message
        : 'Unable to update exam status.';
      toast.error(message);
    }
  };

  const examToView = viewExam ? exams.find(e => e.id === viewExam) : null;
  const viewExamClass = examToView ? classes.find(c => c.id === examToView.classId) : null;
  const viewExamTeacher = examToView ? getUserById(examToView.teacherId) : null;
  const viewExamSubs = examToView ? getSubmissionsByExam(examToView.id) : [];
  const gradedSubs = viewExamSubs.filter(s => s.status === 'graded');
  const avgScore = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.percentage || 0), 0) / gradedSubs.length) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
        <p className="text-gray-500 mt-0.5 text-sm">View and manage all platform exams</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: exams.length, color: 'bg-blue-50 text-blue-600' },
          { label: 'Draft', count: exams.filter(e => e.status === 'draft').length, color: 'bg-gray-50 text-gray-600' },
          { label: 'Published', count: exams.filter(e => e.status === 'published').length, color: 'bg-green-50 text-green-600' },
          { label: 'Completed', count: exams.filter(e => e.status === 'completed').length, color: 'bg-blue-50 text-blue-600' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 border border-gray-200 bg-white`}>
            <div className="text-xl font-bold text-gray-900">{s.count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label} Exams</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['all', 'draft', 'published', 'completed'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Teachers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teachers</SelectItem>
            {teacherOptions.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search exams, classes, teachers..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
      </div>

      {/* Exams Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <PaginatedTable
          items={filtered}
          colSpan={6}
          minWidthClassName="min-w-[860px]"
          bodyClassName="divide-y divide-gray-100"
          header={(
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500">
                <th className="px-6 py-3 text-left font-medium">Exam</th>
                <th className="px-6 py-3 text-left font-medium">Class</th>
                <th className="px-6 py-3 text-left font-medium">Teacher</th>
                <th className="px-6 py-3 text-left font-medium">Status</th>
                <th className="px-6 py-3 text-left font-medium">Submissions</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
          )}
          emptyRow={<div className="px-6 py-12 text-center text-gray-400 text-sm">No exams found</div>}
          renderRow={exam => {
              const cls = classes.find(c => c.id === exam.classId);
              const teacher = getUserById(exam.teacherId);
              const subs = getSubmissionsByExam(exam.id);
              return (
                <tr key={exam.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3.5">
                    <div>
                      <div className="font-medium text-gray-900">{exam.title}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3" />{exam.duration}m
                        <span>·</span>
                        <FileText className="w-3 h-3" />{exam.questions.length} Qs
                        <span>·</span>{exam.totalMarks} marks
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500">{cls?.name || '—'}</td>
                  <td className="px-6 py-3.5 text-gray-500">{teacher?.name || '—'}</td>
                  <td className="px-6 py-3.5">
                    <Select value={exam.status} onValueChange={value => handleStatusChange(exam.id, value as ExamStatus)} size="sm">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span>{subs.length} total</span>
                      <span className="text-green-600">· {subs.filter(s => s.status === 'graded').length} graded</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setViewExam(exam.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(exam.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
          }}
        />
      </div>

      {/* View Exam Modal */}
      <Modal isOpen={!!viewExam} onClose={() => setViewExam(null)} title="Exam Details" size="lg">
        {examToView && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{examToView.title}</h3>
                <p className="text-gray-500 text-sm mt-1">{examToView.description}</p>
              </div>
              <Badge variant={getStatusBadge(examToView.status)}>{examToView.status}</Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                { label: 'Class', value: viewExamClass?.name },
                { label: 'Teacher', value: viewExamTeacher?.name },
                { label: 'Duration', value: `${examToView.duration} minutes` },
                { label: 'Total Marks', value: examToView.totalMarks },
                { label: 'Pass Marks', value: examToView.passingMarks },
                { label: 'Questions', value: examToView.questions.length },
                { label: 'Submissions', value: viewExamSubs.length },
                { label: 'Graded', value: gradedSubs.length },
                { label: 'Avg Score', value: avgScore !== null ? `${avgScore}%` : 'N/A' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                  <div className="text-sm font-semibold text-gray-900">{item.value || '—'}</div>
                </div>
              ))}
            </div>

            {examToView.questions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Questions</h4>
                <div className="space-y-2">
                  {examToView.questions.map((q, i) => (
                    <div key={q.id} className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold flex-shrink-0">Q{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800">{q.text}</div>
                        <div className="text-xs text-gray-400 mt-0.5 capitalize">{q.type.replace('_', ' ')} · {q.marks} marks</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => {
        if (deleteTarget) {
          await handleDelete(deleteTarget);
        }
        setDeleteTarget(null);
      }}
        title="Delete Exam" message="Are you sure you want to delete this exam? All related submissions will also be removed." confirmLabel="Delete Exam" />
    </div>
  );
}
