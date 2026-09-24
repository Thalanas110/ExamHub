import { LayoutDashboard, BookOpen, BarChart2, Users, User } from 'lucide-react';
import type { User as UserEntity } from '@/entities/user';
import { DashboardLayout } from './DashboardLayout';

const navItems = [
  { path: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/student/exams', label: 'My Exams', icon: BookOpen },
  { path: '/student/results', label: 'Results', icon: BarChart2 },
  { path: '/student/classes', label: 'My Classes', icon: Users },
  { path: '/student/profile', label: 'Profile', icon: User },
];

export function StudentLayout({ currentUser, onLogout }: { currentUser: UserEntity; onLogout: () => void }) {
  return <DashboardLayout navItems={navItems} roleLabel="Student" currentUser={currentUser} onLogout={onLogout} />;
}
