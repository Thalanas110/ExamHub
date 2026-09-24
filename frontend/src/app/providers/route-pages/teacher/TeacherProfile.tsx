import React, { useState } from 'react';
import { User, Mail, Phone, BookOpen, Building, Edit2, Save, X, Key } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { toast } from 'sonner';

export function TeacherProfile() {
  const { currentUser, updateUser } = useApp();
  const [editing, setEditing] = useState(false);
  const [changePwd, setChangePwd] = useState(false);
  const [form, setForm] = useState({ name: currentUser?.name || '', phone: currentUser?.phone || '', bio: currentUser?.bio || '', department: currentUser?.department || '' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });

  if (!currentUser) return null;

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    updateUser(currentUser.id, form);
    setEditing(false);
    toast.success('Profile updated successfully');
  };

  const handleChangePwd = () => {
    if (pwd.current !== currentUser.password) { toast.error('Current password is incorrect'); return; }
    if (pwd.next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (pwd.next !== pwd.confirm) { toast.error('Passwords do not match'); return; }
    updateUser(currentUser.id, { password: pwd.next });
    setChangePwd(false);
    setPwd({ current: '', next: '', confirm: '' });
    toast.success('Password changed successfully');
  };

  const avatarInitials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Manage your account information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header Banner */}
        <div className="h-24 bg-gradient-to-r from-green-600 to-blue-600" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end justify-between mb-5">
            <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center border-4 border-white shadow-md">
              <span className="text-white text-2xl font-bold">{avatarInitials}</span>
            </div>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => { setEditing(false); setForm({ name: currentUser.name, phone: currentUser.phone || '', bio: currentUser.bio || '', department: currentUser.department || '' }); }}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                <input type="text" value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Bio</label>
                <textarea rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-gray-900">{currentUser.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-lg font-medium capitalize">{currentUser.role}</span>
                {currentUser.department && <span className="text-xs text-gray-400">{currentUser.department}</span>}
              </div>
              {currentUser.bio && <p className="mt-3 text-sm text-gray-600">{currentUser.bio}</p>}

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" /> {currentUser.email}
                </div>
                {currentUser.phone && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" /> {currentUser.phone}
                  </div>
                )}
                {currentUser.department && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Building className="w-4 h-4 text-gray-400" /> {currentUser.department}
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <BookOpen className="w-4 h-4 text-gray-400" />
                  <span>Member since {new Date(currentUser.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Security</h3>
          </div>
          {!changePwd && (
            <button onClick={() => setChangePwd(true)} className="text-sm text-gray-700 font-medium hover:text-gray-900 underline">Change Password</button>
          )}
        </div>
        {changePwd ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Current Password</label>
              <input type="password" value={pwd.current} onChange={e => setPwd(p => ({ ...p, current: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
              <input type="password" value={pwd.next} onChange={e => setPwd(p => ({ ...p, next: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New Password</label>
              <input type="password" value={pwd.confirm} onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setChangePwd(false); setPwd({ current: '', next: '', confirm: '' }); }}
                className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleChangePwd} className="flex-1 bg-gray-900 text-white py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">Update Password</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Keep your account secure by using a strong, unique password.</p>
        )}
      </div>
    </div>
  );
}