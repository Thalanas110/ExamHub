import { LayoutDashboard, Users, FileText, Clipboard, BarChart2, User, Code2, Archive, BookOpen, ShieldAlert } from 'lucide-react';
import type { User as UserEntity } from '@/entities/user';
import { DashboardLayout } from './DashboardLayout';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/classes', label: 'Classes', icon: BookOpen },
  { path: '/admin/exams', label: 'Exams', icon: FileText },
  { path: '/admin/results', label: 'Results', icon: Clipboard },
  { path: '/admin/violations', label: 'Violations', icon: ShieldAlert },
  { path: '/admin/reports', label: 'Reports', icon: BarChart2 },
  { path: '/admin/tools', label: 'Tools', icon: Archive },
  { path: '/admin/api', label: 'API Docs', icon: Code2 },
  { path: '/admin/profile', label: 'Profile', icon: User },
];

export function AdminLayout({ currentUser, onLogout }: { currentUser: UserEntity; onLogout: () => void }) {
  return <DashboardLayout navItems={navItems} roleLabel="Admin" currentUser={currentUser} onLogout={onLogout} />;
}
