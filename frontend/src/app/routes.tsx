import { createBrowserRouter, Navigate } from 'react-router';
import { lazy, Suspense } from 'react';
import { RouterErrorPage } from '@/widgets/layouts/RouterErrorPage';

const Landing = lazy(() => import('./pages/public/Landing').then(m => ({ default: m.Landing })));
const Login = lazy(() => import('@/features/auth/ui/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('@/features/auth/ui/Register').then(m => ({ default: m.Register })));
const ExamTakingPreview = lazy(() => import('./pages/student/ExamTakingPreview').then(m => ({ default: m.ExamTakingPreview })));

const StudentLayout = lazy(() => import('./pages/student/StudentLayout').then(m => ({ default: m.StudentLayout })));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const StudentExams = lazy(() => import('./pages/student/StudentExams').then(m => ({ default: m.StudentExams })));
const StudentResults = lazy(() => import('./pages/student/StudentResults').then(m => ({ default: m.StudentResults })));
const StudentClasses = lazy(() => import('./pages/student/StudentClasses').then(m => ({ default: m.StudentClasses })));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile').then(m => ({ default: m.StudentProfile })));
const TakeExam = lazy(() => import('./pages/student/TakeExam').then(m => ({ default: m.TakeExam })));

const TeacherLayout = lazy(() => import('./pages/teacher/TeacherLayout').then(m => ({ default: m.TeacherLayout })));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const TeacherExams = lazy(() => import('./pages/teacher/TeacherExams').then(m => ({ default: m.TeacherExams })));
const TeacherClasses = lazy(() => import('./pages/teacher/TeacherClasses').then(m => ({ default: m.TeacherClasses })));
const TeacherGrade = lazy(() => import('./pages/teacher/TeacherGrade').then(m => ({ default: m.TeacherGrade })));
const TeacherProfile = lazy(() => import('./pages/teacher/TeacherProfile').then(m => ({ default: m.TeacherProfile })));
const TeacherViolationCases = lazy(() => import('./pages/teacher/TeacherViolationCases').then(m => ({ default: m.TeacherViolationCases })));
const TeacherTools = lazy(() => import('./pages/teacher/TeacherTools').then(m => ({ default: m.TeacherTools })));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminExams = lazy(() => import('./pages/admin/AdminExams').then(m => ({ default: m.AdminExams })));
const AdminResults = lazy(() => import('./pages/admin/AdminResults').then(m => ({ default: m.AdminResults })));
const AdminReports = lazy(() => import('./pages/admin/AdminReports').then(m => ({ default: m.AdminReports })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminClasses = lazy(() => import('./pages/admin/AdminClasses').then(m => ({ default: m.AdminClasses })));
const AdminViolations = lazy(() => import('./pages/admin/AdminViolations').then(m => ({ default: m.AdminViolations })));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile').then(m => ({ default: m.AdminProfile })));
const AdminApiReference = lazy(() => import('./pages/admin/AdminApiReference').then(m => ({ default: m.AdminApiReference })));
const AdminTools = lazy(() => import('./pages/admin/AdminTools').then(m => ({ default: m.AdminTools })));

function Loading() {
  return null;
}

export function createAppRouter() {
  return createBrowserRouter([
    { path: '/', Component: Landing, errorElement: <RouterErrorPage /> },
    { path: '/login', Component: Login, errorElement: <RouterErrorPage /> },
    { path: '/register', Component: Register, errorElement: <RouterErrorPage /> },
    { path: '/preview/take-exam', Component: ExamTakingPreview, errorElement: <RouterErrorPage /> },
    {
      path: '/student',
      Component: () => <Suspense fallback={<Loading />}><StudentLayout /></Suspense>,
      errorElement: <RouterErrorPage />,
      children: [
        { index: true, Component: StudentDashboard },
        { path: 'exams', Component: StudentExams },
        { path: 'results', Component: StudentResults },
        { path: 'classes', Component: StudentClasses },
        { path: 'profile', Component: StudentProfile },
        { path: 'take-exam/:examId', Component: TakeExam },
      ],
    },
    {
      path: '/teacher',
      Component: () => <Suspense fallback={<Loading />}><TeacherLayout /></Suspense>,
      errorElement: <RouterErrorPage />,
      children: [
        { index: true, Component: TeacherDashboard },
        { path: 'exams', Component: TeacherExams },
        { path: 'classes', Component: TeacherClasses },
        { path: 'grade', Component: TeacherGrade },
        { path: 'tools', Component: TeacherTools },
        { path: 'violation-cases', Component: TeacherViolationCases },
        { path: 'profile', Component: TeacherProfile },
      ],
    },
    {
      path: '/admin',
      Component: () => <Suspense fallback={<Loading />}><AdminLayout /></Suspense>,
      errorElement: <RouterErrorPage />,
      children: [
        { index: true, Component: AdminDashboard },
        { path: 'users', Component: AdminUsers },
        { path: 'exams', Component: AdminExams },
        { path: 'classes', Component: AdminClasses },
        { path: 'results', Component: AdminResults },
        { path: 'violations', Component: AdminViolations },
        { path: 'reports', Component: AdminReports },
        { path: 'tools', Component: AdminTools },
        { path: 'api', Component: AdminApiReference },
        { path: 'profile', Component: AdminProfile },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ]);
}
