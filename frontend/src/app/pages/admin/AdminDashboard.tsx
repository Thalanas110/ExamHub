import React from 'react';
import { useNavigate } from 'react-router';
import { Users, FileText, Clipboard, TrendingUp, ArrowRight, Code2, BarChart2, Archive } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { StatCard } from '@/widgets/layouts/StatCard';
import { Badge, getStatusBadge } from '@/widgets/layouts/Badge';
import { PaginatedTable } from '@/widgets/layouts/PaginatedTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export function AdminDashboard() {
  const { users, exams, submissions, classes, summary, getUserById } = useApp();
  const navigate = useNavigate();

  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');
  const gradedSubs = submissions.filter(s => s.status === 'graded');
  const passRate = gradedSubs.length > 0
    ? Math.round((gradedSubs.filter(s => {
        const exam = exams.find(e => e.id === s.examId);
        return exam && (s.totalScore || 0) >= exam.passingMarks;
      }).length / gradedSubs.length) * 100)
    : 0;

  const avgScore = gradedSubs.length > 0
    ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.percentage || 0), 0) / gradedSubs.length)
    : 0;

  const totalUsers = summary?.users.total ?? users.length;
  const totalStudents = summary?.users.students ?? students.length;
  const totalTeachers = summary?.users.teachers ?? teachers.length;
  const totalExams = summary?.exams.total ?? exams.length;
  const publishedExams = summary?.exams.published ?? exams.filter(e => e.status === 'published').length;
  const totalSubmissions = summary?.submissions.total ?? submissions.length;
  const pendingSubmissions = summary?.submissions.pending ?? submissions.filter(s => s.status === 'submitted').length;
  const dashboardPassRate = summary?.submissions.passRate ?? passRate;
  const dashboardAvgScore = summary?.submissions.averageScore ?? avgScore;

  const userDistData = [
    { name: 'Students', value: summary?.users.students ?? students.length },
    { name: 'Teachers', value: summary?.users.teachers ?? teachers.length },
    { name: 'Admins', value: summary?.users.admins ?? users.filter(u => u.role === 'admin').length },
  ];
  const PIE_COLORS = ['#111827', '#6B7280', '#D1D5DB'];

  const examStatusData = [
    { name: 'Draft', count: summary?.exams.draft ?? exams.filter(e => e.status === 'draft').length },
    { name: 'Published', count: summary?.exams.published ?? exams.filter(e => e.status === 'published').length },
    { name: 'Completed', count: summary?.exams.completed ?? exams.filter(e => e.status === 'completed').length },
  ];

  const classSizes = classes.map(c => c.studentIds.length);

  const classSizeDistribution = [
    {
      range: '0',
      count: classSizes.filter(size => size === 0).length,
    },
    {
      range: '1-10',
      count: classSizes.filter(size => size >= 1 && size <= 10).length,
    },
    {
      range: '11-20',
      count: classSizes.filter(size => size >= 11 && size <= 20).length,
    },
    {
      range: '21-30',
      count: classSizes.filter(size => size >= 21 && size <= 30).length,
    },
    {
      range: '31+',
      count: classSizes.filter(size => size >= 31).length,
    },
  ];
  const emptyClasses = summary?.classes.empty ?? classSizeDistribution[0].count;
  const populatedClasses = summary?.classes.populated ?? classes.length - emptyClasses;
  const totalClasses = summary?.classes.total ?? classes.length;

  const recentSubs = submissions.slice().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-400 mt-0.5 text-sm">Platform overview and statistics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Users" value={totalUsers} icon={Users}
          subtitle={`${totalStudents} students | ${totalTeachers} teachers`} />
        <StatCard title="Total Exams" value={totalExams} icon={FileText}
          subtitle={`${publishedExams} published`} />
        <StatCard title="Submissions" value={totalSubmissions} icon={Clipboard}
          subtitle={`${pendingSubmissions} pending`} />
        <StatCard title="Pass Rate" value={`${dashboardPassRate}%`} icon={TrendingUp}
          subtitle={`Avg score: ${dashboardAvgScore}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">User Distribution</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={userDistData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                {userDistData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Exam Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Exams by Status</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={examStatusData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
              <Bar dataKey="count" fill="#111827" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Class Enrollment Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Class Enrollment Distribution</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={classSizeDistribution} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value) => [value, 'Classes']}
                labelFormatter={(label) => `${label} students`}
                contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }}
              />
              <Bar dataKey="count" fill="#111827" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-center">
              <div className="text-sm font-semibold text-gray-900">{totalClasses}</div>
              <div className="text-[11px] text-gray-500">Total classes</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-center">
              <div className="text-sm font-semibold text-gray-900">{populatedClasses}</div>
              <div className="text-[11px] text-gray-500">With students</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-center">
              <div className="text-sm font-semibold text-gray-900">{emptyClasses}</div>
              <div className="text-[11px] text-gray-500">Empty classes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[
          { label: 'Users', icon: Users, path: '/admin/users' },
          { label: 'Exams', icon: FileText, path: '/admin/exams' },
          { label: 'Results', icon: Clipboard, path: '/admin/results' },
          { label: 'Reports', icon: BarChart2, path: '/admin/reports' },
          { label: 'Tools', icon: Archive, path: '/admin/tools' },
          { label: 'API Docs', icon: Code2, path: '/admin/api' },
        ].map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{item.label}</div>
              <ArrowRight className="w-3 h-3 text-gray-300 mt-0.5" />
            </div>
          </button>
        ))}
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Activity</h2>
          <button onClick={() => navigate('/admin/results')} className="text-xs text-gray-500 font-medium flex items-center gap-1 hover:text-gray-900">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
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
          emptyRow={<div className="px-5 py-8 text-center text-gray-300 text-sm">No recent activity yet</div>}
          renderRow={sub => {
            const student = getUserById(sub.studentId);
            const exam = exams.find(e => e.id === sub.examId);
            return (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="px-5 py-3.5 font-medium text-gray-900 text-sm">{student?.name || 'Unknown'}</td>
                <td className="px-5 py-3.5 text-gray-500 text-sm">{exam?.title || '-'}</td>
                <td className="px-5 py-3.5"><Badge variant={getStatusBadge(sub.status)}>{sub.status}</Badge></td>
                <td className="px-5 py-3.5 text-right text-gray-600 text-sm">
                  {sub.status === 'graded' ? `${sub.percentage}% - ${sub.grade}` : '-'}
                </td>
              </tr>
            );
          }}
        />
      </div>
    </div>
  );
}
