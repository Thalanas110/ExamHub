import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LayoutDashboard, FileText, Users, CheckSquare, User, ShieldAlert, Archive } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '@/widgets/layouts/DashboardLayout';

const navItems = [
  { path: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/teacher/exams', label: 'My Exams', icon: FileText },
  { path: '/teacher/classes', label: 'My Classes', icon: Users },
  { path: '/teacher/grade', label: 'Grade Exams', icon: CheckSquare },
  { path: '/teacher/tools', label: 'Tools', icon: Archive },
  { path: '/teacher/violation-cases', label: 'Case Review', icon: ShieldAlert },
  { path: '/teacher/profile', label: 'Profile', icon: User },
];

export function TeacherLayout() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) { navigate('/', { replace: true }); return; }
    if (currentUser.role !== 'teacher') { navigate(`/${currentUser.role}`, { replace: true }); }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'teacher') return null;

  return <DashboardLayout navItems={navItems} roleLabel="Teacher" currentUser={currentUser} onLogout={logout} />;
}
