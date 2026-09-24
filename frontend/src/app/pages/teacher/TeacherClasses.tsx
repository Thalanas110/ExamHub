import React, { useState } from 'react';
import { Plus, Users, Trash2, UserPlus, UserMinus, Search, Copy, BookOpen, Hash, Pencil } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { Modal, ConfirmDialog } from '@/shared/ui/Modal';
import { Badge } from '@/shared/ui/status-badge';
import { toast } from 'sonner';
import { Class } from '../../data/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export function TeacherClasses() {
  const { currentUser, classes, exams, users, addClass, updateClass, deleteClass, enrollStudent, removeStudentFromClass, getUserById } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [editTarget, setEditTarget] = useState<Class | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ classId: string; studentId: string } | null>(null);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'has_students' | 'empty'>('all');
  const [enrollSearch, setEnrollSearch] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollError, setEnrollError] = useState('');

  const [classForm, setClassForm] = useState({ name: '', subject: '', description: '', code: '' });
  const [editForm, setEditForm] = useState({ name: '', subject: '', description: '', code: '' });

  if (!currentUser) return null;

  const myClasses = classes.filter(c => c.teacherId === currentUser.id);
  const students = users.filter(u => u.role === 'student');
  const subjectOptions = Array.from(new Set(myClasses.map(c => c.subject).filter(Boolean))).sort();
  const filteredClasses = myClasses.filter(cls => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || (
      cls.name.toLowerCase().includes(query) ||
      cls.subject.toLowerCase().includes(query) ||
      cls.code.toLowerCase().includes(query) ||
      (cls.description ?? '').toLowerCase().includes(query)
    );
    const matchesSubject = subjectFilter === 'all' || cls.subject === subjectFilter;
    const matchesRoster = rosterFilter === 'all'
      || (rosterFilter === 'has_students' && cls.studentIds.length > 0)
      || (rosterFilter === 'empty' && cls.studentIds.length === 0);

    return matchesSearch && matchesSubject && matchesRoster;
  });

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const openCreateModal = () => {
    setClassForm({ name: '', subject: '', description: '', code: generateCode() });
    setShowCreateModal(true);
  };

  const handleCreateClass = () => {
    if (!classForm.name.trim() || !classForm.subject.trim()) { toast.error('Name and subject are required'); return; }
    if (!classForm.code.trim()) { toast.error('Class code is required'); return; }
    if (classes.find(c => c.code.toUpperCase() === classForm.code.toUpperCase())) { toast.error('Class code already exists'); return; }
    addClass({ name: classForm.name, subject: classForm.subject, description: classForm.description, code: classForm.code.toUpperCase(), teacherId: currentUser.id });
    toast.success('Class created successfully!');
    setShowCreateModal(false);
  };

  const handleEnrollByEmail = () => {
    setEnrollError('');
    if (!selectedClass) return;
    const student = users.find(u => u.email.toLowerCase() === enrollEmail.toLowerCase());
    if (!student) { setEnrollError('No user found with that email'); return; }
    if (student.role !== 'student') { setEnrollError('This user is not a student'); return; }
    const result = enrollStudent(selectedClass.id, student.id);
    if (result.success) { toast.success(`${student.name} enrolled successfully`); setEnrollEmail(''); }
    else { setEnrollError(result.error || 'Failed to enroll'); }
  };

  const handleRemoveStudent = (classId: string, studentId: string) => {
    removeStudentFromClass(classId, studentId);
    toast.success('Student removed from class');
  };

  const handleDeleteClass = (id: string) => { deleteClass(id); toast.success('Class deleted'); };

  const openEditModal = (cls: Class) => {
    setEditTarget(cls);
    setEditForm({ name: cls.name, subject: cls.subject, description: cls.description ?? '', code: cls.code });
    setShowEditModal(true);
  };

  const handleEditClass = () => {
    if (!editTarget) return;
    if (!editForm.name.trim() || !editForm.subject.trim()) { toast.error('Name and subject are required'); return; }
    if (!editForm.code.trim()) { toast.error('Class code is required'); return; }
    const codeConflict = classes.find(c => c.code.toUpperCase() === editForm.code.toUpperCase() && c.id !== editTarget.id);
    if (codeConflict) { toast.error('Class code already in use'); return; }
    updateClass(editTarget.id, { name: editForm.name.trim(), subject: editForm.subject.trim(), description: editForm.description.trim(), code: editForm.code.toUpperCase() });
    toast.success('Class updated');
    setShowEditModal(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success('Code copied!')).catch(() => toast.error('Failed to copy'));
  };

  const filteredStudents = selectedClass
    ? students.filter(s =>
        selectedClass.studentIds.includes(s.id) &&
        (s.name.toLowerCase().includes(enrollSearch.toLowerCase()) || s.email.toLowerCase().includes(enrollSearch.toLowerCase()))
      )
    : [];

  const unenrolledStudents = selectedClass ? students.filter(s => !selectedClass.studentIds.includes(s.id)) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Create classes and manage student enrollment</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
          <Plus className="w-4 h-4" /> New Class
        </button>
      </div>

      {myClasses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <div className="text-gray-500 font-medium">No classes yet</div>
          <div className="text-gray-400 text-sm mt-1">Create your first class to start enrolling students</div>
          <button onClick={openCreateModal} className="mt-4 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700">Create Class</button>
        </div>
      ) : (
        <>
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
              placeholder="Search classes..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm bg-white"
            />
          </div>
        </div>

        {filteredClasses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <div className="text-gray-500 font-medium">No classes match the selected filters</div>
            <div className="text-gray-400 text-sm mt-1">Adjust the search, subject, or roster filter.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredClasses.map(cls => {
            const classExams = exams.filter(e => e.classId === cls.id);
            const enrolledStudents = students.filter(s => cls.studentIds.includes(s.id));

            return (
              <div key={cls.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-500">{cls.subject}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => copyCode(cls.code)} title="Copy class code"
                        className="flex items-center gap-1.5 font-mono text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2.5 py-1 rounded-lg transition-colors">
                        <Hash className="w-3 h-3" />{cls.code}
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {cls.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{cls.description}</p>}

                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {cls.studentIds.length} students</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {classExams.length} exams</span>
                    <span className="text-gray-300">Created {new Date(cls.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Student Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {enrolledStudents.slice(0, 5).map(s => (
                      <div key={s.id} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1 text-xs text-gray-600">
                        <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-gray-600" style={{ fontSize: '8px', fontWeight: 700 }}>{s.name[0]}</span>
                        </div>
                        {s.name.split(' ')[0]}
                        <button onClick={() => setRemoveTarget({ classId: cls.id, studentId: s.id })} className="text-gray-300 hover:text-red-500 ml-0.5">
                          <UserMinus className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {enrolledStudents.length > 5 && (
                      <div className="bg-gray-100 rounded-full px-2.5 py-1 text-xs text-gray-500">+{enrolledStudents.length - 5} more</div>
                    )}
                    {enrolledStudents.length === 0 && (
                      <div className="text-xs text-gray-400">No students enrolled yet</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => { setSelectedClass(cls); setEnrollEmail(''); setEnrollError(''); setEnrollSearch(''); setShowStudentModal(true); }}
                      className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
                      <UserPlus className="w-4 h-4" /> Manage Students
                    </button>
                    <button onClick={() => openEditModal(cls)} className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50" title="Edit class">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(cls.id)} className="p-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
        </>
      )}

      {/* Edit Class Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Class" size="md"
        footer={
          <>
            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={handleEditClass} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-700 transition-colors">Save Changes</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Name *</label>
            <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mathematics 101"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
            <input type="text" value={editForm.subject} onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Mathematics"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Code</label>
            <div className="flex gap-2">
              <input type="text" value={editForm.code} onChange={e => setEditForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} maxLength={10}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
              <button type="button" onClick={() => setEditForm(p => ({ ...p, code: generateCode() }))} className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Regenerate
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Students use this code to join your class</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={3} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief class description..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </Modal>

      {/* Create Class Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Class" size="md"
        footer={
          <>
            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreateClass} className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-700 transition-colors">Create Class</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Name *</label>
            <input type="text" value={classForm.name} onChange={e => setClassForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mathematics 101"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
            <input type="text" value={classForm.subject} onChange={e => setClassForm(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Mathematics"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Code</label>
            <div className="flex gap-2">
              <input type="text" value={classForm.code} onChange={e => setClassForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} maxLength={10} placeholder="AUTO-GENERATED"
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
              <button type="button" onClick={() => setClassForm(p => ({ ...p, code: generateCode() }))} className="px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Regenerate
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Students use this code to join your class</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={3} value={classForm.description} onChange={e => setClassForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief class description..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
      </Modal>

      {/* Student Management Modal */}
      <Modal isOpen={showStudentModal} onClose={() => setShowStudentModal(false)} title={`Manage Students — ${selectedClass?.name || ''}`} size="lg">
        {selectedClass && (
          <div className="space-y-5">
            {/* Enroll by email */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Enroll Student by Email</h4>
              <div className="flex gap-2">
                <input type="email" value={enrollEmail} onChange={e => { setEnrollEmail(e.target.value); setEnrollError(''); }} placeholder="student@example.com"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
                <button onClick={handleEnrollByEmail} className="px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 flex-shrink-0 transition-colors">Enroll</button>
              </div>
              {enrollError && <p className="text-xs text-red-500 mt-1.5">{enrollError}</p>}
            </div>

            {/* Quick enroll from list */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Quick Enroll (All Students)</h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {unenrolledStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{s.name}</div>
                      <div className="text-xs text-gray-400">{s.email}</div>
                    </div>
                    <button onClick={() => { const r = enrollStudent(selectedClass.id, s.id); if (r.success) toast.success(`${s.name} enrolled`); else toast.error(r.error); }}
                      className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors">
                      Enroll
                    </button>
                  </div>
                ))}
                {unenrolledStudents.length === 0 && <div className="text-xs text-gray-400 py-3 text-center">All students are enrolled</div>}
              </div>
            </div>

            {/* Enrolled Students */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800">Enrolled Students ({selectedClass.studentIds.length})</h4>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)} placeholder="Search..."
                    className="pl-7 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-36" />
                </div>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filteredStudents.length === 0 && selectedClass.studentIds.length === 0 && (
                  <div className="text-xs text-gray-400 py-4 text-center">No students enrolled</div>
                )}
                {filteredStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 text-xs font-bold flex-shrink-0">
                        {s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{s.name}</div>
                        <div className="text-xs text-gray-400">{s.email} · {s.department}</div>
                      </div>
                    </div>
                    <button onClick={() => { setRemoveTarget({ classId: selectedClass.id, studentId: s.id }); setShowStudentModal(false); }}
                      className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">
                      <UserMinus className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={() => { if (removeTarget) { handleRemoveStudent(removeTarget.classId, removeTarget.studentId); setRemoveTarget(null); } }}
        title="Remove Student" message="Are you sure you want to remove this student from the class? They can rejoin using the class code." confirmLabel="Remove" />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) { handleDeleteClass(deleteTarget); setDeleteTarget(null); } }}
        title="Delete Class" message="Are you sure you want to delete this class? All associated data will be removed. This cannot be undone." confirmLabel="Delete Class" />
    </div>
  );
}
