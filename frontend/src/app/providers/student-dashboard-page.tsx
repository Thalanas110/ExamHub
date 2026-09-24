import { useApp } from './AppProvider';
import { StudentDashboard as StudentDashboardWidget } from '@/widgets/student-dashboard/StudentDashboard';

export function StudentDashboardPage() {
  const { currentUser, classes, exams, summary, getSubmissionsByStudent, getStudentSubmission } = useApp();
  if (!currentUser) return null;

  return (
    <StudentDashboardWidget
      currentUser={currentUser}
      classes={classes}
      exams={exams}
      summary={summary}
      getSubmissionsByStudent={getSubmissionsByStudent}
      getStudentSubmission={getStudentSubmission}
    />
  );
}
