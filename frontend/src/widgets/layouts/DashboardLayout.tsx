import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { LucideIcon, BookOpen, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { ConfirmDialog } from './Modal';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface DashboardUser {
  name?: string;
  email?: string;
  role?: string;
}

interface DashboardLayoutProps {
  navItems: NavItem[];
  roleLabel?: string;
  currentUser: DashboardUser | null;
  onLogout: () => void;
}

export function DashboardLayout({ navItems, roleLabel, currentUser, onLogout }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const initials = currentUser?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const SidebarContent = () => (
    <div className="portal-sidebar h-full min-h-0 rounded-[1.75rem] border border-gray-200 bg-white/85 shadow-[0_28px_56px_-36px_rgba(53,31,15,0.7)] backdrop-blur-xl flex flex-col overflow-hidden">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gray-900 flex items-center justify-center shadow-[0_12px_24px_-12px_rgba(51,26,10,0.8)]">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-base tracking-tight">ExamHub</div>
            <div className="text-xs text-gray-500 capitalize mt-0.5">{roleLabel || currentUser?.role} workspace</div>
          </div>
        </div>
      </div>

      <nav className="portal-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path.split('/').filter(Boolean).length <= 1}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-gray-900 text-white shadow-[0_14px_24px_-16px_rgba(54,29,13,0.85)]'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 group-hover:bg-white/45 flex items-center justify-center transition-colors">
              <item.icon className="w-4 h-4 flex-shrink-0" />
            </div>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100 bg-white/60">
        <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-2xl bg-gray-50 border border-gray-100">
          <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_10px_22px_-14px_rgba(52,26,10,0.9)]">
            <span className="text-white text-xs font-semibold tracking-wide">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate leading-none">{currentUser?.name}</div>
            <div className="text-xs text-gray-500 truncate mt-1">{currentUser?.email}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmSignOut(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="portal-shell flex h-screen overflow-hidden">
      <div className="hidden lg:block w-[280px] xl:w-[300px] flex-shrink-0 p-3 xl:p-4">
        <div className="sticky top-3 xl:top-4 h-[calc(100vh-1.5rem)] xl:h-[calc(100vh-2rem)]">
          <SidebarContent />
        </div>
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/35 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-[84vw] max-w-[310px] h-dvh min-h-0 p-3">
            <SidebarContent />
          </div>
          <button
            type="button"
            className="absolute top-5 right-5 z-10 p-2 bg-white rounded-xl border border-gray-200 shadow-md"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="sticky top-0 z-30 px-3 pt-3 lg:px-4 lg:pt-4">
          <div className="portal-topbar rounded-2xl border border-gray-200 bg-white/85 backdrop-blur-xl px-4 lg:px-5 py-3 flex items-center justify-between shadow-[0_20px_34px_-28px_rgba(53,31,15,0.65)]">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 uppercase tracking-[0.16em]">
                <span>ExamHub</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-700 font-semibold capitalize tracking-[0.1em]">{currentUser?.role} Portal</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center shadow-[0_10px_20px_-12px_rgba(52,26,10,0.85)]">
                <span className="text-white text-xs font-semibold tracking-wide">{initials}</span>
              </div>
              <div className="hidden sm:block min-w-0">
                <div className="text-sm font-semibold text-gray-900 leading-none truncate">{currentUser?.name}</div>
                <div className="text-xs text-gray-500 mt-1 capitalize">{currentUser?.role}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="portal-scroll flex-1 overflow-y-auto overscroll-contain px-3 lg:px-4 pt-3 lg:pt-4 pb-4 lg:pb-6">
          <div className="w-full max-w-[1280px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={handleLogout}
        title="Sign out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign out"
      />
    </div>
  );
}
