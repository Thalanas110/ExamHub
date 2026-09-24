import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LayoutDashboard, BookOpen, BarChart2, Users, User } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { DashboardLayout } from '@/widgets/layouts/DashboardLayout';

const navItems = [
  { path: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/student/exams', label: 'My Exams', icon: BookOpen },
  { path: '/student/results', label: 'Results', icon: BarChart2 },
  { path: '/student/classes', label: 'My Classes', icon: Users },
  { path: '/student/profile', label: 'Profile', icon: User },
];

export function StudentLayout() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) { navigate('/', { replace: true }); return; }
    if (currentUser.role !== 'student') { navigate(`/${currentUser.role}`, { replace: true }); }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'student') return null;

  return <DashboardLayout navItems={navItems} roleLabel="Student" currentUser={currentUser} onLogout={logout} />;
}
