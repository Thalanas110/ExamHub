import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from './AppProvider';
import { AdminLayout as AdminLayoutWidget } from '@/widgets/layouts/AdminLayout';
import { TeacherLayout as TeacherLayoutWidget } from '@/widgets/layouts/TeacherLayout';
import { StudentLayout as StudentLayoutWidget } from '@/widgets/layouts/StudentLayout';

type Role = 'admin' | 'teacher' | 'student';

function useRoleLayout(role: Role) {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) { navigate('/', { replace: true }); return; }
    if (currentUser.role !== role) { navigate(`/${currentUser.role}`, { replace: true }); }
  }, [currentUser, navigate, role]);

  return currentUser?.role === role ? { currentUser, logout } : null;
}

export function AdminLayout() {
  const state = useRoleLayout('admin');
  if (!state) return null;
  return <AdminLayoutWidget currentUser={state.currentUser} onLogout={state.logout} />;
}

export function TeacherLayout() {
  const state = useRoleLayout('teacher');
  if (!state) return null;
  return <TeacherLayoutWidget currentUser={state.currentUser} onLogout={state.logout} />;
}

export function StudentLayout() {
  const state = useRoleLayout('student');
  if (!state) return null;
  return <StudentLayoutWidget currentUser={state.currentUser} onLogout={state.logout} />;
}
