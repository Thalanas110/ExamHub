import React, { useState } from 'react';
import { TrendingUp, Award, Users, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PaginatedTable } from '../../components/shared/PaginatedTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

const COLORS = ['#111827', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'];
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function normalizeMonthKey(value?: string | null): string | null {
  if (!value) return null;

  const directMatch = value.match(/^(\d{4})-(\d{2})/);
  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function monthKeyToDate(monthKey: string): Date {
  const [yearString, monthString] = monthKey.split('-');
  return new Date(Date.UTC(Number(yearString), Number(monthString) - 1, 1));
}

function shiftMonthKey(monthKey: string, offset: number): string {
  const monthDate = monthKeyToDate(monthKey);
  monthDate.setUTCMonth(monthDate.getUTCMonth() + offset);
  return `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}`;
}

function listMonthKeys(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let cursor = startKey;
  let guard = 0;

  while (cursor <= endKey && guard < 240) {
    keys.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
    guard += 1;
  }

  return keys;
}

export function AdminReports() {
  const { exams, submissions, classes, users, getUserById } = useApp();
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'passed' | 'failed'>('all');

  const subjectOptions = Array.from(new Set(classes.map(c => c.subject).filter(Boolean))).sort();
  const teacherOptions = users.filter(user => user.role === 'teacher');
  const filteredClasses = classes.filter(cls => {
    const matchesClass = classFilter === 'all' || cls.id === classFilter;
    const matchesSubject = subjectFilter === 'all' || cls.subject === subjectFilter;
    const matchesTeacher = teacherFilter === 'all' || cls.teacherId === teacherFilter;

    return matchesClass && matchesSubject && matchesTeacher;
  });
  const filteredClassIds = new Set(filteredClasses.map(cls => cls.id));
  const scopedExams = exams.filter(exam => filteredClassIds.has(exam.classId));
  const scopedExamIds = new Set(scopedExams.map(exam => exam.id));
  const scopedSubmissions = submissions.filter(submission => scopedExamIds.has(submission.examId));
  const gradedSubs = scopedSubmissions.filter(s => {
    if (s.status !== 'graded') return false;
    if (outcomeFilter === 'all') return true;
    const exam = scopedExams.find(item => item.id === s.examId);
    const passed = !!exam && (s.totalScore || 0) >= exam.passingMarks;

    return outcomeFilter === 'passed' ? passed : !passed;
  });
  const hasScopeFilter = classFilter !== 'all' || subjectFilter !== 'all' || teacherFilter !== 'all';
  const activeLearnerIds = new Set(filteredClasses.flatMap(cls => cls.studentIds));
  const activeLearnerCount = hasScopeFilter ? activeLearnerIds.size : users.filter(u => u.role === 'student').length;

  // Grade distribution
  const gradeCount: Record<string, number> = {};
  gradedSubs.forEach(s => { if (s.grade) gradeCount[s.grade] = (gradeCount[s.grade] || 0) + 1; });
  const gradeData = ['A+', 'A', 'B', 'C', 'C+', 'B-', 'D', 'F'].filter(g => gradeCount[g]).map(g => ({ grade: g, count: gradeCount[g] || 0 }));

  // Class average performance
  const classPerf = filteredClasses.map(cls => {
    const classExamIds = new Set(scopedExams.filter(e => e.classId === cls.id).map(e => e.id));
    const classSubs = gradedSubs.filter(s => classExamIds.has(s.examId));
    const avg = classSubs.length > 0 ? Math.round(classSubs.reduce((sum, s) => sum + (s.percentage || 0), 0) / classSubs.length) : 0;
    return { name: cls.name.length > 16 ? cls.name.substring(0, 16) + '...' : cls.name, avg, submissions: classSubs.length };
  });

  // Pass/Fail
  const passCount = gradedSubs.filter(s => {
    const exam = exams.find(e => e.id === s.examId);
    return exam && (s.totalScore || 0) >= exam.passingMarks;
  }).length;
  const failCount = gradedSubs.length - passCount;
  const passPieData = [{ name: 'Passed', value: passCount }, { name: 'Failed', value: failCount }].filter(d => d.value > 0);

  // Monthly activity trend based on real exam creation and submission timestamps.
  const examCountByMonth = new Map<string, number>();
  scopedExams.forEach(exam => {
    const monthKey = normalizeMonthKey(exam.createdAt);
    if (!monthKey) return;
    examCountByMonth.set(monthKey, (examCountByMonth.get(monthKey) ?? 0) + 1);
  });

  const submissionCountByMonth = new Map<string, number>();
  const trendSubmissions = outcomeFilter === 'all' ? scopedSubmissions : gradedSubs;
  trendSubmissions.forEach(submission => {
    const monthKey = normalizeMonthKey(submission.submittedAt || submission.gradedAt);
    if (!monthKey) return;
    submissionCountByMonth.set(monthKey, (submissionCountByMonth.get(monthKey) ?? 0) + 1);
  });

  const observedMonthKeys = Array.from(new Set([
    ...examCountByMonth.keys(),
    ...submissionCountByMonth.keys(),
  ])).sort();

  let trendMonthKeys: string[];
  if (observedMonthKeys.length === 0) {
    const currentMonthKey = normalizeMonthKey(new Date().toISOString()) ?? '1970-01';
    trendMonthKeys = Array.from({ length: 6 }, (_, index) => shiftMonthKey(currentMonthKey, index - 5));
  } else {
    const firstObservedMonth = observedMonthKeys[0];
    const lastObservedMonth = observedMonthKeys[observedMonthKeys.length - 1];
    const rangeKeys = listMonthKeys(firstObservedMonth, lastObservedMonth);
    trendMonthKeys = rangeKeys.length > 6 ? rangeKeys.slice(-6) : rangeKeys;
  }

  const monthlyData = trendMonthKeys.map(monthKey => ({
    month: MONTH_LABEL_FORMATTER.format(monthKeyToDate(monthKey)),
    submissions: submissionCountByMonth.get(monthKey) ?? 0,
    exams: examCountByMonth.get(monthKey) ?? 0,
  }));

  // Top performers
  const studentScores: Record<string, { name: string; total: number; count: number }> = {};
  gradedSubs.forEach(s => {
    const student = getUserById(s.studentId);
    if (!student) return;
    if (!studentScores[s.studentId]) studentScores[s.studentId] = { name: student.name, total: 0, count: 0 };
    studentScores[s.studentId].total += s.percentage || 0;
    studentScores[s.studentId].count += 1;
  });
  const topStudents = Object.values(studentScores)
    .map(s => ({ name: s.name, avg: Math.round(s.total / s.count), exams: s.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5);

  // Subject performance
  const subjectPerf: Record<string, { total: number; count: number }> = {};
  gradedSubs.forEach(s => {
    const exam = scopedExams.find(e => e.id === s.examId);
    const cls = exam ? classes.find(c => c.id === exam.classId) : null;
    if (!cls) return;
    if (!subjectPerf[cls.subject]) subjectPerf[cls.subject] = { total: 0, count: 0 };
    subjectPerf[cls.subject].total += s.percentage || 0;
    subjectPerf[cls.subject].count += 1;
  });
  const subjectData = Object.entries(subjectPerf).map(([subject, data]) => ({
    subject: subject.length > 14 ? subject.substring(0, 14) + '...' : subject,
    avg: Math.round(data.total / data.count),
  }));

  const platformAvg = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.percentage || 0), 0) / gradedSubs.length) : 0;
  const passRate = gradedSubs.length > 0 ? Math.round((passCount / gradedSubs.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Platform-wide performance analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Platform Avg Score', value: `${platformAvg}%`, icon: TrendingUp },
          { label: 'Pass Rate', value: `${passRate}%`, icon: Award },
          { label: 'Total Assessments', value: scopedExams.length, icon: FileText },
          { label: 'Active Learners', value: activeLearnerCount, icon: Users },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
              <s.icon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classes.map(cls => <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjectOptions.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teachers</SelectItem>
              {teacherOptions.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={outcomeFilter} onValueChange={value => setOutcomeFilter(value as 'all' | 'passed' | 'failed')}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              <SelectItem value="passed">Passed only</SelectItem>
              <SelectItem value="failed">Failed only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Report filters apply to KPIs, charts, class performance, and top performers.
        </p>
      </div>

      {/* Row 1: Trend + Pass/Fail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Monthly Activity Trend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="submissions" stroke="#111827" strokeWidth={2} dot={{ fill: '#111827', r: 3 }} name="Submissions" />
              <Line type="monotone" dataKey="exams" stroke="#9CA3AF" strokeWidth={2} dot={{ fill: '#9CA3AF', r: 3 }} name="Exams" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Pass / Fail Rate</h2>
          {passPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={passPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {passPieData.map((_, i) => <Cell key={i} fill={['#111827', '#D1D5DB'][i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data</div>}
        </div>
      </div>

      {/* Row 2: Grade Distribution + Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Grade Distribution</h2>
          {gradeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gradeData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [v, 'Students']} contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {gradeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No graded data yet</div>}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Avg Score by Subject</h2>
          {subjectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subjectData} layout="vertical" margin={{ top: 0, right: 8, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="subject" type="category" tick={{ fontSize: 10, fill: '#9CA3AF' }} width={90} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
                <Bar dataKey="avg" fill="#111827" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data</div>}
        </div>
      </div>

      {/* Class Performance */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Class Performance Overview</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={classPerf} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v, key) => [key === 'avg' ? `${v}%` : v, key === 'avg' ? 'Avg Score' : 'Submissions']} contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="avg" name="Avg Score (%)" fill="#111827" radius={[3, 3, 0, 0]} />
            <Bar dataKey="submissions" name="Submissions" fill="#D1D5DB" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Top Performers</h2>
        </div>
        <PaginatedTable
          items={topStudents}
          colSpan={4}
          minWidthClassName="min-w-[620px]"
          bodyClassName="divide-y divide-gray-50"
          header={(
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-5 py-3 text-left font-medium">Rank</th>
                <th className="px-5 py-3 text-left font-medium">Student</th>
                <th className="px-5 py-3 text-left font-medium">Avg Score</th>
                <th className="px-5 py-3 text-left font-medium">Exams</th>
              </tr>
            </thead>
          )}
          emptyRow={<div className="px-5 py-8 text-center text-gray-300 text-sm">No data available</div>}
          renderRow={(s, i) => (
              <tr key={s.name} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {i + 1}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {s.name[0]}
                    </div>
                    <span className="font-medium text-gray-900">{s.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full w-24">
                      <div className="h-1.5 bg-gray-900 rounded-full" style={{ width: `${s.avg}%` }} />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">{s.avg}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-400 text-sm">{s.exams}</td>
              </tr>
          )}
        />
      </div>

    </div>
  );
}
