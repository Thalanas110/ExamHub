import React, { useState } from 'react';
import { Users, BookOpen, Hash, LogOut, Plus, GraduationCap, Search } from 'lucide-react';
import { useApp } from '@/app/providers/AppProvider';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/shared/ui/Modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';

export function StudentClasses() {
  const { currentUser, classes, exams, joinClassByCode, leaveClass, getUserById } = useApp();
  const [code, setCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joiningLoading, setJoiningLoading] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [teacherFilter, setTeacherFilter] = useState('all');

  if (!currentUser) return null;

  const myClasses = classes.filter(c => c.studentIds.includes(currentUser.id));
  const subjectOptions = Array.from(new Set(myClasses.map(c => c.subject).filter(Boolean))).sort();
  const teacherOptions = Array.from(
    new Map(
      myClasses
        .map(c => getUserById(c.teacherId))
        .filter(Boolean)
        .map(teacher => [teacher!.id, teacher!])
    ).values()
  );
  const filteredClasses = myClasses.filter(c => {
    const teacher = getUserById(c.teacherId);
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || (
      c.name.toLowerCase().includes(query) ||
      c.subject.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      (teacher?.name ?? '').toLowerCase().includes(query)
    );
    const matchesSubject = subjectFilter === 'all' || c.subject === subjectFilter;
    const matchesTeacher = teacherFilter === 'all' || c.teacherId === teacherFilter;

    return matchesSearch && matchesSubject && matchesTeacher;
  });

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setJoinError('');
    setJoiningLoading(true);
    const result = await joinClassByCode(code.trim(), currentUser.id);
    if (result.success) {
      toast.success('Successfully joined the class!');
      setCode('');
    } else {
      setJoinError(result.error || 'Failed to join class');
    }
    setJoiningLoading(false);
  };

  const handleLeave = (classId: string) => {
    leaveClass(classId, currentUser.id);
    toast.success('Left the class');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
        <p className="text-gray-500 mt-0.5 text-sm">Manage your class enrollments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Join Class Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Join a Class</h2>
                <p className="text-xs text-gray-400">Enter the class code from your teacher</p>
              </div>
            </div>

            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Class Code</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setJoinError(''); }}
                    placeholder="e.g. MATH01"
                    maxLength={10}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm font-mono tracking-widest bg-white"
                  />
                </div>
                {joinError && <p className="text-xs text-red-500 mt-1.5">{joinError}</p>}
              </div>
              <button
                type="submit" disabled={joiningLoading || !code.trim()}
                className="w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {joiningLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {joiningLoading ? 'Joining...' : 'Join Class'}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Available Class Codes</h3>
              <div className="space-y-1.5">
                {classes.filter(c => !c.studentIds.includes(currentUser.id)).slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs text-gray-500">
                    <span>{c.name}</span>
                    <button onClick={() => setCode(c.code)} className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700 hover:bg-gray-200 font-medium">{c.code}</button>
                  </div>
                ))}
                {classes.filter(c => !c.studentIds.includes(currentUser.id)).length === 0 && (
                  <div className="text-xs text-gray-400">You've joined all available classes</div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gray-900 rounded-xl p-5 mt-4 text-white">
            <div className="text-3xl font-bold mb-1">{myClasses.length}</div>
            <div className="text-blue-100 text-sm">Enrolled Classes</div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-2xl font-bold">{exams.filter(e => myClasses.some(c => c.id === e.classId)).length}</div>
              <div className="text-blue-100 text-sm">Total Exams</div>
            </div>
          </div>
        </div>

        {/* Classes List */}
        <div className="lg:col-span-2 space-y-4">
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
              <SelectTrigger className="w-full sm:w-44 bg-white">
                <SelectValue placeholder="Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teachers</SelectItem>
                {teacherOptions.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm bg-white"
              />
            </div>
          </div>

          {filteredClasses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <div className="text-gray-500 font-medium">{myClasses.length === 0 ? 'No classes yet' : 'No classes match the selected filters'}</div>
              <div className="text-gray-400 text-sm mt-1">{myClasses.length === 0 ? 'Enter a class code to join your first class' : 'Adjust the search, subject, or teacher filter.'}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClasses.map(cls => {
                const teacher = getUserById(cls.teacherId);
                const classExams = exams.filter(e => e.classId === cls.id);
                const publishedExams = classExams.filter(e => e.status === 'published');

                return (
                  <div key={cls.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                          <p className="text-sm text-gray-500">{cls.subject}</p>
                          {cls.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cls.description}</p>}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>{teacher?.name || 'Unknown Teacher'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              <span>{cls.studentIds.length} students</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{publishedExams.length} exams</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium">{cls.code}</span>
                        <button
                          onClick={() => setLeaveTarget(cls.id)}
                          className="flex items-center gap-1 text-red-500 text-xs hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Leave
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!leaveTarget}
        onClose={() => setLeaveTarget(null)}
        onConfirm={() => { if (leaveTarget) handleLeave(leaveTarget); setLeaveTarget(null); }}
        title="Leave Class"
        message="Are you sure you want to leave this class? You can rejoin later using the class code."
        confirmLabel="Leave Class"
      />
    </div>
  );
}
