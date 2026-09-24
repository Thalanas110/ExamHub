import React, { useState } from 'react';
import { BookOpen, Hash, Pencil, Search, Trash2, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog, Modal } from '../../components/shared/Modal';
import { PaginatedTable } from '../../components/shared/PaginatedTable';
import { Class } from '../../data/types';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

export function AdminClasses() {
  const { classes, exams, users, updateClass, deleteClass, getUserById } = useApp();

  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'has_students' | 'empty'>('all');
  const [editTarget, setEditTarget] = useState<Class | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', subject: '', description: '', code: '' });

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const openEditModal = (cls: Class) => {
    setEditTarget(cls);
    setEditForm({ name: cls.name, subject: cls.subject, description: cls.description ?? '', code: cls.code });
  };

  const handleSave = () => {
    if (!editTarget) return;
    if (!editForm.name.trim() || !editForm.subject.trim()) { toast.error('Name and subject are required'); return; }
    if (!editForm.code.trim()) { toast.error('Class code is required'); return; }
    const codeConflict = classes.find(c => c.code.toUpperCase() === editForm.code.toUpperCase() && c.id !== editTarget.id);
    if (codeConflict) { toast.error('Class code already in use'); return; }
    updateClass(editTarget.id, {
      name: editForm.name.trim(),
      subject: editForm.subject.trim(),
      description: editForm.description.trim(),
      code: editForm.code.toUpperCase(),
    });
    toast.success('Class updated');
    setEditTarget(null);
  };

  const handleDelete = (id: string) => {
    deleteClass(id);
    toast.success('Class deleted');
  };

  const filtered = classes.filter(c => {
    const teacher = getUserById(c.teacherId);
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || (
      c.name.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q) ||
      (teacher?.name ?? '').toLowerCase().includes(q)
    );
    const matchesSubject = subjectFilter === 'all' || c.subject === subjectFilter;
    const matchesTeacher = teacherFilter === 'all' || c.teacherId === teacherFilter;
    const matchesRoster = rosterFilter === 'all'
      || (rosterFilter === 'has_students' && c.studentIds.length > 0)
      || (rosterFilter === 'empty' && c.studentIds.length === 0);

    return matchesSearch && matchesSubject && matchesTeacher && matchesRoster;
  });
  const subjectOptions = Array.from(new Set(classes.map(c => c.subject).filter(Boolean))).sort();
  const teacherOptions = users.filter(user => user.role === 'teacher');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
        <p className="text-gray-500 mt-0.5 text-sm">View and edit all classes across the platform</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-white">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjectOptions.map(subject => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={teacherFilter} onValueChange={setTeacherFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-white">
            <SelectValue placeholder="Teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teachers</SelectItem>
            {teacherOptions.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={rosterFilter} onValueChange={value => setRosterFilter(value as 'all' | 'has_students' | 'empty')}>
          <SelectTrigger className="w-full sm:w-44 bg-white">
            <SelectValue placeholder="Roster" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rosters</SelectItem>
            <SelectItem value="has_students">Has students</SelectItem>
            <SelectItem value="empty">No students</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search classes, teachers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 w-full bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <PaginatedTable
          items={filtered}
          colSpan={6}
          minWidthClassName="min-w-[800px]"
          bodyClassName="divide-y divide-gray-100"
          header={(
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500">
                <th className="px-6 py-3 text-left font-medium">Class</th>
                <th className="px-6 py-3 text-left font-medium">Code</th>
                <th className="px-6 py-3 text-left font-medium">Teacher</th>
                <th className="px-6 py-3 text-left font-medium">Students</th>
                <th className="px-6 py-3 text-left font-medium">Exams</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
          )}
          renderRow={cls => {
            const teacher = getUserById(cls.teacherId);
            const classExams = exams.filter(e => e.classId === cls.id);
            return (
              <tr key={cls.id} className="hover:bg-gray-50">
                <td className="px-6 py-3.5">
                  <div className="font-medium text-gray-900">{cls.name}</div>
                  <div className="text-xs text-gray-400">{cls.subject}</div>
                </td>
                <td className="px-6 py-3.5">
                  <span className="inline-flex items-center gap-1 font-mono text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                    <Hash className="w-3 h-3" />{cls.code}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-600">{teacher?.name ?? '—'}</td>
                <td className="px-6 py-3.5">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="w-3.5 h-3.5 text-gray-400" />{cls.studentIds.length}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <BookOpen className="w-3.5 h-3.5 text-gray-400" />{classExams.length}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => openEditModal(cls)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(cls.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          }}
          emptyRow={(
            <tr>
              <td colSpan={6} className="px-6 py-16 text-center">
                <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <div className="text-gray-500 font-medium">No classes found</div>
              </td>
            </tr>
          )}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Class"
        size="md"
        footer={
          <>
            <button onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-700 transition-colors">Save Changes</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Name *</label>
            <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
            <input type="text" value={editForm.subject} onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Code</label>
            <div className="flex gap-2">
              <input type="text" value={editForm.code} onChange={e => setEditForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} maxLength={10}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900 uppercase" />
              <button type="button" onClick={() => setEditForm(p => ({ ...p, code: generateCode() }))} className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Regenerate
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Students use this code to join the class</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={3} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief class description..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) { handleDelete(deleteTarget); setDeleteTarget(null); } }}
        title="Delete Class"
        message="Are you sure you want to delete this class? All associated data will be removed. This cannot be undone."
        confirmLabel="Delete Class"
      />
    </div>
  );
}
