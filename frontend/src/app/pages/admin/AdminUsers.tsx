import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Users, GraduationCap, BookOpen, Shield } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { Badge } from '@/widgets/layouts/Badge';
import { Modal, ConfirmDialog } from '@/shared/ui/Modal';
import { PaginatedTable } from '@/shared/ui/PaginatedTable';
import { User, UserRole } from '../../data/types';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

const roleConfig = {
  student: { label: 'Student', variant: 'gray' as const, icon: GraduationCap, bg: 'bg-gray-100', color: 'text-gray-600' },
  teacher: { label: 'Teacher', variant: 'info' as const, icon: BookOpen, bg: 'bg-gray-100', color: 'text-gray-600' },
  admin:   { label: 'Admin',   variant: 'blue' as const, icon: Shield, bg: 'bg-gray-900', color: 'text-white' },
};

export function AdminUsers() {
  const { users, addUser, updateUser, deleteUser } = useApp();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' as UserRole, department: '', phone: '' });

  const filtered = users.filter(u => {
    const match = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    return match && (roleFilter === 'all' || u.role === roleFilter);
  });

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: '', email: '', password: 'password123', role: 'student', department: '', phone: '' });
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: u.password, role: u.role, department: u.department || '', phone: u.phone || '' });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email are required'); return; }
    if (!editUser && !form.password.trim()) { toast.error('Password is required'); return; }
    if (!editUser && users.find(u => u.email === form.email)) { toast.error('Email already in use'); return; }

    if (editUser) {
      updateUser(editUser.id, { name: form.name, email: form.email, role: form.role, department: form.department, phone: form.phone, ...(form.password ? { password: form.password } : {}) });
      toast.success('User updated successfully');
    } else {
      addUser({ name: form.name, email: form.email, password: form.password, role: form.role, department: form.department, phone: form.phone, joinedAt: new Date().toISOString().split('T')[0] });
      toast.success('User created successfully');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => { deleteUser(id); toast.success('User deleted'); };

  const counts = { all: users.length, student: users.filter(u => u.role === 'student').length, teacher: users.filter(u => u.role === 'teacher').length, admin: users.filter(u => u.role === 'admin').length };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Manage all platform users</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'all',     label: 'Total Users', icon: Users,        bg: 'bg-gray-100', color: 'text-gray-600' },
          { key: 'student', label: 'Students',    icon: GraduationCap, bg: 'bg-gray-100', color: 'text-gray-600' },
          { key: 'teacher', label: 'Teachers',    icon: BookOpen,     bg: 'bg-gray-100', color: 'text-gray-600' },
          { key: 'admin',   label: 'Admins',      icon: Shield,       bg: 'bg-gray-900', color: 'text-white' },
        ].map(s => (
          <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
              <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
            </div>
            <div className="text-xl font-bold text-gray-900">{counts[s.key as keyof typeof counts]}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['all', 'student', 'teacher', 'admin'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${roleFilter === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {r}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <PaginatedTable
          items={filtered}
          colSpan={6}
          minWidthClassName="min-w-[780px]"
          bodyClassName="divide-y divide-gray-100"
          header={(
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500">
                <th className="px-6 py-3 text-left font-medium">User</th>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">Role</th>
                <th className="px-6 py-3 text-left font-medium">Department</th>
                <th className="px-6 py-3 text-left font-medium">Joined</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
          )}
          emptyRow={<div className="px-6 py-12 text-center text-gray-400 text-sm">No users found</div>}
          renderRow={u => {
              const cfg = roleConfig[u.role];
              const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 ${cfg.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <span className={`text-xs font-bold ${cfg.color}`}>{initials}</span>
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-gray-500">{u.email}</td>
                  <td className="px-6 py-3.5">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </td>
                  <td className="px-6 py-3.5 text-gray-400">{u.department || '—'}</td>
                  <td className="px-6 py-3.5 text-gray-400">{new Date(u.joinedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
          }}
        />
      </div>

      {/* User Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? `Edit User — ${editUser.name}` : 'Create New User'} size="md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-700 transition-colors">
              {editUser ? 'Save Changes' : 'Create User'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <Select value={form.role} onValueChange={value => setForm(p => ({ ...p, role: value as UserRole }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {editUser ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
              <input type="text" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} placeholder="e.g. Science"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) { handleDelete(deleteTarget); setDeleteTarget(null); } }}
        title="Delete User" message="Are you sure you want to permanently delete this user? This action cannot be undone." confirmLabel="Delete User" />
    </div>
  );
}
