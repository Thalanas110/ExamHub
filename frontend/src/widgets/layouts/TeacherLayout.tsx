import { LayoutDashboard, FileText, Users, CheckSquare, User, ShieldAlert, Archive } from 'lucide-react';
import type { User as UserEntity } from '@/entities/user';
import { DashboardLayout } from './DashboardLayout';

const navItems = [
  { path: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/teacher/exams', label: 'My Exams', icon: FileText },
  { path: '/teacher/classes', label: 'My Classes', icon: Users },
  { path: '/teacher/grade', label: 'Grade Exams', icon: CheckSquare },
  { path: '/teacher/tools', label: 'Tools', icon: Archive },
  { path: '/teacher/violation-cases', label: 'Case Review', icon: ShieldAlert },
  { path: '/teacher/profile', label: 'Profile', icon: User },
];

export function TeacherLayout({ currentUser, onLogout }: { currentUser: UserEntity; onLogout: () => void }) {
  return <DashboardLayout navItems={navItems} roleLabel="Teacher" currentUser={currentUser} onLogout={onLogout} />;
}
