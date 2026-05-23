import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { LayoutDashboard, Users, FileText, Clipboard, BarChart2, User, Code2, Archive, BookOpen, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../components/shared/DashboardLayout';

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

export function AdminLayout() {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) { navigate('/', { replace: true }); return; }
    if (currentUser.role !== 'admin') { navigate(`/${currentUser.role}`, { replace: true }); }
  }, [currentUser, navigate]);

  if (!currentUser || currentUser.role !== 'admin') return null;

  return <DashboardLayout navItems={navItems} roleLabel="Admin" />;
}
