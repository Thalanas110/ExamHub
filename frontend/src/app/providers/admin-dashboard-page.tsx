import { useApp } from '@/app/providers/AppProvider';
import { AdminDashboard } from '@/widgets/admin-dashboard/AdminDashboard';

export function AdminDashboardPage() {
  const { users, exams, submissions, classes, summary, getUserById } = useApp();
  return <AdminDashboard {...{ users, exams, submissions, classes, summary, getUserById }} />;
}
