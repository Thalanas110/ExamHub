import React from 'react';
import { QuestionAnalyticsSection } from '@/features/analytics/question-analytics/QuestionAnalyticsSection';

export function TeacherAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Question Analytics</h1>
        <p className="mt-0.5 text-sm text-gray-500">Inspect difficulty, pacing, and weak-topic signals from your classes.</p>
      </div>

      <QuestionAnalyticsSection audienceLabel="Teacher" />
    </div>
  );
}
