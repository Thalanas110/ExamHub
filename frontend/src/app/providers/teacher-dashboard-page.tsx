import { useApp } from './AppProvider';
import { TeacherDashboard as TeacherDashboardWidget } from '@/widgets/teacher-dashboard/TeacherDashboard';

export function TeacherDashboardPage() {
  const { currentUser, classes, exams, submissions, summary, getUserById } = useApp();
  if (!currentUser) return null;

  return (
    <TeacherDashboardWidget
      currentUser={currentUser}
      classes={classes}
      exams={exams}
      submissions={submissions}
      summary={summary}
      getUserById={getUserById}
    />
  );
}
