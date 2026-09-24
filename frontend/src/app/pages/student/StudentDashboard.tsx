import React from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, Users, CheckCircle, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../../components/shared/StatCard';
import { Badge, getGradeBadge } from '../../components/shared/Badge';
import { PaginatedTable } from '../../components/shared/PaginatedTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export function StudentDashboard() {
  const { currentUser, classes, exams, summary, getSubmissionsByStudent, getStudentSubmission } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const myClasses = classes.filter(c => c.studentIds.includes(currentUser.id));
  const myClassIds = new Set(myClasses.map(c => c.id));
  const myExams = exams.filter(e => myClassIds.has(e.classId));
  const submissions = getSubmissionsByStudent(currentUser.id);
  const gradedSubs = submissions.filter(s => s.status === 'graded' && s.percentage !== undefined);
  const avgScore = gradedSubs.length > 0 ? Math.round(gradedSubs.reduce((sum, s) => sum + (s.percentage || 0), 0) / gradedSubs.length) : 0;

  const availableExams = myExams.filter(e => e.status === 'published' && !getStudentSubmission(e.id, currentUser.id));
  const completedExams = myExams.filter(e => getStudentSubmission(e.id, currentUser.id));
  const dashboardClasses = summary?.classes.total ?? myClasses.length;
  const dashboardAvailableExams = summary?.exams.published ?? availableExams.length;
  const dashboardCompletedExams = summary?.submissions.total ?? completedExams.length;
  const dashboardAvgScore = summary?.submissions.averageScore ?? avgScore;

  const chartData = gradedSubs.slice(-6).map(s => {
    const exam = myExams.find(e => e.id === s.examId);
    return {
      name: (exam?.title || 'Exam').substring(0, 12) + '…',
      score: s.percentage || 0,
      pass: exam?.passingMarks ? Math.round((exam.passingMarks / exam.totalMarks) * 100) : 50,
    };
  });

  const upcomingExams = availableExams.slice(0, 5);
  const recentResults = gradedSubs.slice().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Welcome back, {currentUser.name.split(' ')[0]}</h1>
        <p className="text-gray-400 mt-0.5 text-sm">Your academic overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Enrolled Classes" value={dashboardClasses} icon={Users} />
        <StatCard title="Available Exams" value={dashboardAvailableExams} icon={BookOpen} />
        <StatCard title="Completed" value={dashboardCompletedExams} icon={CheckCircle} />
        <StatCard title="Average Score" value={dashboardAvgScore > 0 ? `${dashboardAvgScore}%` : '—'} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Performance Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Performance History</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Score']}
                  contentStyle={{ fontSize: 12, border: '1px solid #E5E7EB', borderRadius: 8 }}
                />
                <ReferenceLine y={50} stroke="#E5E7EB" strokeDasharray="4 2" />
                <Bar dataKey="score" fill="#111827" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No results yet</div>
          )}
        </div>

        {/* Available Exams */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Available Exams</h2>
            <button onClick={() => navigate('/student/exams')} className="text-xs text-gray-500 font-medium flex items-center gap-1 hover:text-gray-900">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {upcomingExams.length === 0 ? (
              <div className="text-center py-8 text-gray-300 text-sm">No available exams</div>
            ) : (
              upcomingExams.map(exam => (
                <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{exam.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{exam.duration} min · {exam.totalMarks} marks</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/student/take-exam/${exam.id}`)}
                    className="ml-3 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 flex-shrink-0 transition-colors"
                  >
                    Take Exam
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Results */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Recent Results</h2>
          <button onClick={() => navigate('/student/results')} className="text-xs text-gray-500 font-medium flex items-center gap-1 hover:text-gray-900">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentResults.length === 0 ? (
          <div className="text-center py-8 text-gray-300 text-sm">No graded results yet</div>
        ) : (
          <PaginatedTable
            items={recentResults}
            colSpan={4}
            minWidthClassName="min-w-[560px]"
            bodyClassName="divide-y divide-gray-50"
            header={(
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-3 pb-3 text-left font-medium">Exam</th>
                  <th className="px-3 pb-3 text-left font-medium">Date</th>
                  <th className="px-3 pb-3 text-right font-medium">Score</th>
                  <th className="px-3 pb-3 text-right font-medium">Grade</th>
                </tr>
              </thead>
            )}
            emptyRow={<div className="px-3 py-8 text-center text-gray-300 text-sm">No graded results yet</div>}
            renderRow={sub => {
              const exam = myExams.find(e => e.id === sub.examId);
              return (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 font-medium text-gray-900">{exam?.title || 'Unknown Exam'}</td>
                  <td className="px-3 py-3 text-gray-400">{new Date(sub.gradedAt || sub.submittedAt).toLocaleDateString()}</td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-semibold text-gray-900">{sub.totalScore}/{exam?.totalMarks}</span>
                    <span className="text-gray-400 ml-1 text-xs">({sub.percentage}%)</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Badge variant={getGradeBadge(sub.grade)}>{sub.grade}</Badge>
                  </td>
                </tr>
              );
            }}
          />
        )}
      </div>

      {/* High achiever note — neutral */}
      {avgScore >= 80 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-xl">✦</span>
          <div>
            <div className="text-sm font-semibold text-gray-900">High Achiever</div>
            <div className="text-xs text-gray-500">Your average score of {avgScore}% puts you in the top performers.</div>
          </div>
        </div>
      )}
    </div>
  );
}
