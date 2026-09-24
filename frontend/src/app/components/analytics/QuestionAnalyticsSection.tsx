import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  BookOpen,
  Clock,
  Filter,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  reportApi,
  type CommonWrongAnswerReport,
  type QuestionAnalyticsQuestion,
  type QuestionAnalyticsReport,
  type WeakTopicByClassReport,
} from '../../services/api';
import { EmptyState } from '../../features/analytics/question-analytics/components/EmptyState';
import { ListCard } from '../../features/analytics/question-analytics/components/ListCard';
import { PaginatedTable } from '../shared/PaginatedTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  filterQuestions,
  filterWeakTopics,
  filterWrongAnswers,
  getClassOptions,
  getExamOptions,
  getHardestQuestions,
  getSelectedExamClassId,
  getSlowestQuestions,
  getTopicOptions,
} from '../../features/analytics/question-analytics/lib/filters';
import { formatSeconds, scoreTone } from '../../features/analytics/question-analytics/lib/formatters';

type QuestionAnalyticsSectionProps = {
  audienceLabel: 'Teacher' | 'Admin';
};

export function QuestionAnalyticsSection({ audienceLabel }: QuestionAnalyticsSectionProps) {
  const [report, setReport] = useState<QuestionAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedExam, setSelectedExam] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const next = await reportApi.getQuestionAnalytics();
        if (!active) return;
        setReport(next);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const classOptions = useMemo(() => getClassOptions(report), [report]);
  const examOptions = useMemo(() => getExamOptions(report, selectedClass), [report, selectedClass]);
  const topicOptions = useMemo(() => getTopicOptions(report, selectedClass, selectedExam), [report, selectedClass, selectedExam]);
  const selectedExamClassId = useMemo(() => getSelectedExamClassId(report, selectedExam), [report, selectedExam]);
  const filteredQuestions = useMemo(() => filterQuestions(report, selectedClass, selectedExam, selectedTopic), [report, selectedClass, selectedExam, selectedTopic]);
  const filteredWrongAnswers = useMemo(() => filterWrongAnswers(report, selectedClass, selectedExam, selectedTopic), [report, selectedClass, selectedExam, selectedTopic]);
  const filteredWeakTopics = useMemo(() => filterWeakTopics(report, selectedClass, selectedExamClassId, selectedTopic), [report, selectedClass, selectedExamClassId, selectedTopic]);
  const hardestQuestions = useMemo(() => getHardestQuestions(filteredQuestions), [filteredQuestions]);
  const slowestQuestions = useMemo(() => getSlowestQuestions(filteredQuestions), [filteredQuestions]);

  const telemetryCoveragePct = report && report.coverage.totalSubmissions > 0
    ? Math.round((report.coverage.telemetryEnabledSubmissions / report.coverage.totalSubmissions) * 100)
    : 0;
  const topicCoveragePct = report && report.coverage.totalQuestions > 0
    ? Math.round((report.coverage.topicTaggedQuestions / report.coverage.totalQuestions) * 100)
    : 0;

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-gray-200 bg-white p-8 shadow-[0_22px_52px_-36px_rgba(40,28,17,0.6)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-gray-100" />
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-72 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
          <div>
            <h3 className="text-sm font-semibold text-red-900">Question analytics could not be loaded</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(17,24,39,0.12),_transparent_28%),linear-gradient(135deg,_#fffdf7,_#ffffff_55%,_#f7f7f5)] px-6 py-5 shadow-[0_28px_64px_-40px_rgba(47,31,17,0.6)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          {/* Header */}
          <div className="flex items-center gap-3 lg:shrink-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-[0_16px_34px_-20px_rgba(17,24,39,0.9)]">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold tracking-tight text-gray-900">Question Intelligence</h2>
                <span className="rounded-full border border-white/60 bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 backdrop-blur">
                  Future-aware
                </span>
              </div>
              <p className="mt-0.5 max-w-xs text-xs text-gray-500">
                {audienceLabel} view of difficulty, wrong-answer patterns, pacing, and weak topics.
              </p>
            </div>
          </div>

          <div className="hidden h-10 w-px shrink-0 bg-black/10 lg:block" />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex-1">
            {[
              {
                label: 'Telemetry Coverage',
                value: `${telemetryCoveragePct}%`,
                note: `${report.coverage.telemetryEnabledSubmissions}/${report.coverage.totalSubmissions} submissions`,
                icon: Clock,
              },
              {
                label: 'Topic Coverage',
                value: `${topicCoveragePct}%`,
                note: `${report.coverage.topicTaggedQuestions}/${report.coverage.totalQuestions} tagged`,
                icon: BookOpen,
              },
              {
                label: 'Questions in Scope',
                value: filteredQuestions.length,
                note: 'After filters',
                icon: BarChart2,
              },
              {
                label: 'Classes in Scope',
                value: new Set(filteredQuestions.map(question => question.classId)).size,
                note: 'Scoped analytics',
                icon: Users,
              },
            ].map(card => (
              <div key={card.label} className="rounded-xl border border-white/70 bg-white/80 px-3 py-2.5 backdrop-blur">
                <div className="flex items-center gap-1.5">
                  <card.icon className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  <span className="text-lg font-semibold text-gray-900">{card.value}</span>
                </div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">{card.label}</div>
                <div className="mt-0.5 text-[11px] text-gray-500">{card.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Scope Filters</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All exams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All exams</SelectItem>
              {examOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>{option.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedTopic} onValueChange={setSelectedTopic}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topicOptions.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Time-based metrics only appear for newer attempts that submitted telemetry. Topic-based insights only use questions tagged with a topic.
        </p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ListCard
          title="Hardest Questions"
          subtitle="Lowest average score after grading"
          items={hardestQuestions.map(question => (
            <div key={question.questionId} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{question.questionText}</div>
                  <div className="mt-1 text-xs text-gray-500">{question.examTitle} • {question.className}{question.topic ? ` • ${question.topic}` : ''}</div>
                </div>
                <div className={`text-right text-lg font-semibold ${scoreTone(question.averageScorePct)}`}>
                  {question.averageScorePct?.toFixed(1)}%
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{question.gradedCount} graded responses</span>
                <span>{question.correctRatePct !== null && question.correctRatePct !== undefined ? `${question.correctRatePct.toFixed(1)}% correct` : 'Manual grading only'}</span>
              </div>
            </div>
          ))}
        />

        <ListCard
          title="Slowest Questions"
          subtitle="Average time spent from telemetry-enabled attempts"
          items={slowestQuestions.map(question => (
            <div key={question.questionId} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{question.questionText}</div>
                  <div className="mt-1 text-xs text-gray-500">{question.examTitle} • {question.className}{question.topic ? ` • ${question.topic}` : ''}</div>
                </div>
                <div className="text-right text-lg font-semibold text-gray-900">
                  {formatSeconds(question.averageTimeSpentSeconds)}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{question.telemetryCount} attempts with telemetry</span>
                <span>{question.averageScorePct !== null && question.averageScorePct !== undefined ? `${question.averageScorePct.toFixed(1)}% avg score` : 'Ungraded'}</span>
              </div>
            </div>
          ))}
        />

        <ListCard
          title="Common Wrong Answers"
          subtitle="Most-selected incorrect options for MCQs"
          items={filteredWrongAnswers.slice(0, 5).map((item: CommonWrongAnswerReport) => (
            <div key={`${item.questionId}-${item.option}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{item.questionText}</div>
                  <div className="mt-1 text-xs text-gray-500">{item.examTitle} • {item.className}{item.topic ? ` • ${item.topic}` : ''}</div>
                </div>
                <div className="rounded-xl bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                  {item.option}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{item.count} incorrect selections</span>
                <span>{item.shareOfIncorrectPct.toFixed(1)}% of wrong answers</span>
              </div>
            </div>
          ))}
        />

        <ListCard
          title="Weak Topics by Class"
          subtitle="Lowest-performing tagged topics within scope"
          items={filteredWeakTopics.slice(0, 5).map((item: WeakTopicByClassReport) => (
            <div key={`${item.classId}-${item.topic}`} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{item.topic}</div>
                  <div className="mt-1 text-xs text-gray-500">{item.className}</div>
                </div>
                <div className={`text-right text-lg font-semibold ${scoreTone(item.averageScorePct)}`}>
                  {item.averageScorePct.toFixed(1)}%
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{item.questionCount} tagged questions</span>
                <span>{formatSeconds(item.averageTimeSpentSeconds)}</span>
              </div>
            </div>
          ))}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Question Performance Ledger</h3>
          <p className="mt-1 text-xs text-gray-500">Detailed per-question metrics after the current filters are applied.</p>
        </div>

        {filteredQuestions.length === 0 ? (
          <div className="px-5 py-8">
            <EmptyState title="No question analytics yet" body="Once graded submissions and tagged questions exist, this ledger will populate automatically." />
          </div>
        ) : (
          <PaginatedTable
            items={filteredQuestions}
            colSpan={6}
            minWidthClassName="min-w-[920px]"
            bodyClassName="divide-y divide-gray-100"
            header={(
              <thead className="bg-gray-50">
                <tr className="text-left text-xs uppercase tracking-[0.16em] text-gray-400">
                  <th className="px-5 py-3 font-medium">Question</th>
                  <th className="px-5 py-3 font-medium">Scope</th>
                  <th className="px-5 py-3 font-medium">Avg Score</th>
                  <th className="px-5 py-3 font-medium">Correct Rate</th>
                  <th className="px-5 py-3 font-medium">Avg Time</th>
                  <th className="px-5 py-3 font-medium">Coverage</th>
                </tr>
              </thead>
            )}
            emptyRow={<div className="px-5 py-8 text-center text-gray-400 text-sm">No question analytics yet</div>}
            renderRow={(question: QuestionAnalyticsQuestion) => (
                  <tr key={`${question.examId}-${question.questionId}`} className="hover:bg-gray-50/70">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{question.questionText}</div>
                      <div className="mt-1 text-xs text-gray-500">{question.questionType.replace('_', ' ')}{question.topic ? ` • ${question.topic}` : ' • Untagged'}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">
                      <div>{question.examTitle}</div>
                      <div className="mt-1 text-xs text-gray-400">{question.className}</div>
                    </td>
                    <td className={`px-5 py-4 font-semibold ${scoreTone(question.averageScorePct)}`}>
                      {question.averageScorePct !== null && question.averageScorePct !== undefined ? `${question.averageScorePct.toFixed(1)}%` : 'Pending'}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {question.correctRatePct !== null && question.correctRatePct !== undefined ? `${question.correctRatePct.toFixed(1)}%` : 'n/a'}
                    </td>
                    <td className="px-5 py-4 text-gray-600">{formatSeconds(question.averageTimeSpentSeconds)}</td>
                    <td className="px-5 py-4 text-gray-500">
                      <div>{question.gradedCount} graded</div>
                      <div className="mt-1 text-xs text-gray-400">{question.telemetryCount} with telemetry</div>
                    </td>
                  </tr>
            )}
          />
        )}
      </section>
    </div>
  );
}
