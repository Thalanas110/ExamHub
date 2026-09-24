import React from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, Users, FileText, Clock, ArrowRight } from 'lucide-react';
import type { Class } from '@/entities/class';
import type { Exam } from '@/entities/exam';
import type { Submission } from '@/entities/submission';
import type { User } from '@/entities/user';
import { StatCard } from '@/shared/ui/StatCard';
import { Badge, getStatusBadge } from '@/shared/ui/status-badge';
import { PaginatedTable } from '@/shared/ui/PaginatedTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface TeacherDashboardProps {
  currentUser: User;
  classes: Class[];
  exams: Exam[];
  submissions: Submission[];
  summary: {
    users: { students: number };
    exams: { total: number };
    classes: { total: number };
    submissions: { pending: number };
  } | null;
  getUserById: (id: string) => User | undefined;
}

export function TeacherDashboard({
  currentUser,
  classes,
  exams,
  submissions,
  summary,
  getUserById,
}: TeacherDashboardProps) {
  const navigate = useNavigate();

  if (!currentUser) return null;

  const myClasses = classes.filter(c => c.teacherId === currentUser.id);
  const myExams = exams.filter(e => e.teacherId === currentUser.id);
  const myExamIds = new Set(myExams.map(e => e.id));
  const allSubs = submissions.filter(s => myExamIds.has(s.examId));
  const pendingGrades = allSubs.filter(s => s.status === 'submitted').length;
  const totalStudents = new Set(myClasses.flatMap(c => c.studentIds)).size;
  const dashboardClasses = summary?.classes.total ?? myClasses.length;
  const dashboardStudents = summary?.users.students ?? totalStudents;
  const dashboardExams = summary?.exams.total ?? myExams.length;
  const dashboardPending = summary?.submissions.pending ?? pendingGrades;

  const classChartData = myClasses.map(cls => {
    const classExams = myExams.filter(e => e.classId === cls.id);
    const classExamIds = new Set(classExams.map(e => e.id));
    const classSubs = allSubs.filter(s => classExamIds.has(s.examId) && s.status === 'graded' && s.percentage !== undefined);
    const avg = classSubs.length > 0 ? Math.round(classSubs.reduce((sum, s) => sum + (s.percentage || 0), 0) / classSubs.length) : 0;
    return { name: cls.name.length > 14 ? cls.name.substring(0, 14) + '…' : cls.name, avg, students: cls.studentIds.length };
  });

  const gradedCount = allSubs.filter(s => s.status === 'graded').length;
  const submittedCount = allSubs.filter(s => s.status === 'submitted').length;
  const pieData = [
    { name: 'Graded', value: gradedCount },
    { name: 'Pending', value: submittedCount },
  ].filter(d => d.value > 0);

  const recentSubs = allSubs.slice().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-400 mt-0.5 text-sm">Welcome back, {currentUser.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="My Classes" value={dashboardClasses} icon={Users} />
        <StatCard title="Total Students" value={dashboardStudents} icon={Users} />
        <StatCard title="My Exams" value={dashboardExams} icon={FileText} />
        <StatCard title="Pending Grades" value={dashboardPending} icon={Clock}
          subtitle={dashboardPending > 0 ? 'Needs attention' : 'All caught up'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Class Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Class Average Scores</h2>
          {classChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={classChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, 'Average']} contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
                <Bar dataKey="avg" fill="#111827" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data yet</div>
          )}
        </div>

        {/* Submission Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Submission Status</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={['#111827', '#D1D5DB'][i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No submissions yet</div>
          )}
          {pendingGrades > 0 && (
            <button onClick={() => navigate('/teacher/grade')} className="w-full mt-3 bg-gray-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center justify-center gap-2 transition-colors">
              Grade Now <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* My Classes Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">My Classes</h2>
          <button onClick={() => navigate('/teacher/classes')} className="text-xs text-gray-500 font-medium flex items-center gap-1 hover:text-gray-900">
            Manage <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {myClasses.map(cls => {
            const classExams = myExams.filter(e => e.classId === cls.id);
            return (
              <div key={cls.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100">
                <div className="font-medium text-gray-900 text-sm mb-0.5 truncate">{cls.name}</div>
                <div className="text-xs text-gray-400 mb-3">{cls.subject}</div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {cls.studentIds.length}</span>
                  <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {classExams.length}</span>
                </div>
              </div>
            );
          })}
          {myClasses.length === 0 && (
            <div className="col-span-4 text-center py-8 text-gray-300 text-sm">No classes yet.</div>
          )}
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Submissions</h2>
          <button onClick={() => navigate('/teacher/grade')} className="text-xs text-gray-500 font-medium flex items-center gap-1 hover:text-gray-900">
            Grade <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentSubs.length === 0 ? (
          <div className="py-8 text-center text-gray-300 text-sm">No submissions yet</div>
        ) : (
          <PaginatedTable
            items={recentSubs}
            colSpan={4}
            minWidthClassName="min-w-[640px]"
            bodyClassName="divide-y divide-gray-50"
            header={(
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left font-medium">Student</th>
                  <th className="px-5 py-3 text-left font-medium">Exam</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Score</th>
                </tr>
              </thead>
            )}
            emptyRow={<div className="px-5 py-8 text-center text-gray-300 text-sm">No submissions yet</div>}
            renderRow={sub => {
              const student = getUserById(sub.studentId);
              const exam = myExams.find(e => e.id === sub.examId);
              return (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{student?.name || 'Unknown'}</td>
                  <td className="px-5 py-3 text-gray-500">{exam?.title || '—'}</td>
                  <td className="px-5 py-3"><Badge variant={getStatusBadge(sub.status)}>{sub.status}</Badge></td>
                  <td className="px-5 py-3 text-right text-gray-600">
                    {sub.status === 'graded' ? `${sub.percentage}%` : '—'}
                  </td>
                </tr>
              );
            }}
          />
        )}
      </div>
    </div>
  );
}
