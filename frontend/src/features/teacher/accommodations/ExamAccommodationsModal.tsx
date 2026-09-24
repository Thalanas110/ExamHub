import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Clock, RotateCcw, Save, Users } from 'lucide-react';
import { Modal, ConfirmDialog } from '@/shared/ui/Modal';
import { accommodationApi, type AccommodationRecord, type AccommodationPayload } from '@/entities/accommodation';
import type { Exam } from '@/entities/exam';
import type { Class } from '@/entities/class';
import type { User } from '@/entities/user';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { DateTimePicker } from '@/shared/ui/date-time-picker';

interface Props {
  exam: Exam | null;
  classes: Class[];
  users: User[];
  onClose: () => void;
}

const blankForm = (): AccommodationPayload => ({
  extraTimeMinutes: 0,
  attemptLimit: null,
  alternateStartAt: null,
  alternateEndAt: null,
  accessibilityPreferences: [],
});

const toInputDatetime = (iso: string | null): string => {
  if (!iso) return '';
  // Trim to 'YYYY-MM-DDTHH:MM'
  return iso.slice(0, 16);
};

const fromInputDatetime = (val: string): string | null => {
  if (!val.trim()) return null;
  return val + ':00'; // add seconds
};

export function ExamAccommodationsModal({ exam, classes, users, onClose }: Props) {
  const [accommodations, setAccommodations] = useState<AccommodationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // editing state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [form, setForm] = useState<AccommodationPayload>(blankForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [newStudentId, setNewStudentId] = useState('');

  const examClass = exam ? classes.find(c => c.id === exam.classId) : null;
  const enrolledStudents: User[] = examClass
    ? users.filter(u => u.role === 'student' && examClass.studentIds.includes(u.id))
    : [];

  useEffect(() => {
    if (!exam) return;
    setAccommodations([]);
    setEditingStudentId(null);
    setForm(blankForm());
    setNewStudentId('');
    setLoading(true);
    accommodationApi.listByExam(exam.id)
      .then(data => setAccommodations(data))
      .catch(() => toast.error('Could not load accommodations.'))
      .finally(() => setLoading(false));
  }, [exam]);

  if (!exam) return null;

  const accommodatedIds = new Set(accommodations.map(a => a.studentId));
  const unenrolledStudents = enrolledStudents.filter(s => !accommodatedIds.has(s.id));

  const openEdit = (a: AccommodationRecord) => {
    setEditingStudentId(a.studentId);
    setForm({
      extraTimeMinutes: a.extraTimeMinutes,
      attemptLimit: a.attemptLimit,
      alternateStartAt: a.alternateStartAt,
      alternateEndAt: a.alternateEndAt,
      accessibilityPreferences: a.accessibilityPreferences ?? [],
    });
  };

  const openAdd = () => {
    if (!newStudentId) { toast.error('Select a student first.'); return; }
    setEditingStudentId(newStudentId);
    setForm(blankForm());
  };

  const cancelEdit = () => {
    setEditingStudentId(null);
    setForm(blankForm());
  };

  const handleSave = async () => {
    if (!editingStudentId) return;
    if (form.extraTimeMinutes < 0 || form.extraTimeMinutes > 1440) {
      toast.error('Extra time must be between 0 and 1440 minutes.'); return;
    }
    if (form.attemptLimit !== null && (form.attemptLimit < 1 || form.attemptLimit > 20)) {
      toast.error('Attempt limit must be between 1 and 20.'); return;
    }
    const hasStart = !!form.alternateStartAt;
    const hasEnd = !!form.alternateEndAt;
    if (hasStart !== hasEnd) {
      toast.error('Alternate start and end must be set together.'); return;
    }

    setSaving(true);
    try {
      const saved = await accommodationApi.upsert(exam.id, editingStudentId, form);
      setAccommodations(prev => {
        const exists = prev.find(a => a.studentId === editingStudentId);
        return exists
          ? prev.map(a => a.studentId === editingStudentId ? saved : a)
          : [...prev, saved];
      });
      setEditingStudentId(null);
      setForm(blankForm());
      setNewStudentId('');
      toast.success('Accommodation saved.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save accommodation.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    try {
      await accommodationApi.remove(exam.id, studentId);
      setAccommodations(prev => prev.filter(a => a.studentId !== studentId));
      if (editingStudentId === studentId) cancelEdit();
      toast.success('Accommodation removed.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove accommodation.';
      toast.error(msg);
    }
  };

  const studentName = (id: string) => users.find(u => u.id === id)?.name ?? id.slice(0, 8) + '…';

  const editingStudent = editingStudentId ? users.find(u => u.id === editingStudentId) : null;

  return (
    <>
      <Modal
        isOpen={!!exam}
        onClose={onClose}
        title={`Accommodations — ${exam.title}`}
        size="xl"
      >
        <div className="space-y-5">

          {/* Current accommodations list */}
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Existing Accommodations
            </div>
            {loading ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : accommodations.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                <div className="text-gray-400 text-sm">No accommodations set for this exam</div>
              </div>
            ) : (
              <div className="space-y-2">
                {accommodations.map(a => {
                  const isEditing = editingStudentId === a.studentId;
                  return (
                    <div key={a.studentId}
                      className={`rounded-xl border p-4 transition-colors ${isEditing ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{studentName(a.studentId)}</div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-400">
                              {a.extraTimeMinutes > 0 && <span>+{a.extraTimeMinutes} min extra</span>}
                              {a.attemptLimit !== null && <span>{a.attemptLimit} attempt(s)</span>}
                              {a.alternateStartAt && <span>Alt window set</span>}
                              {(a.accessibilityPreferences ?? []).length > 0 && (
                                <span>{a.accessibilityPreferences.length} pref(s)</span>
                              )}
                              {a.extraTimeMinutes === 0 && a.attemptLimit === null && !a.alternateStartAt && (a.accessibilityPreferences ?? []).length === 0 && (
                                <span className="text-gray-300">No adjustments</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!isEditing && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => openEdit(a)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(a.studentId)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Inline edit form */}
                      {isEditing && (
                        <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
                          <AccommodationForm
                            exam={exam}
                            form={form}
                            onChange={setForm}
                          />
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              onClick={cancelEdit}
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add new accommodation */}
          {!editingStudentId && enrolledStudents.length > 0 && (
            <div className="border-t border-gray-100 pt-5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Add Accommodation
              </div>
              {unenrolledStudents.length === 0 ? (
                <p className="text-sm text-gray-400">All enrolled students already have accommodations.</p>
              ) : (
                <div className="flex items-center gap-2">
                  <Select value={newStudentId} onValueChange={setNewStudentId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select student…" />
                    </SelectTrigger>
                    <SelectContent>
                      {unenrolledStudents.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={openAdd}
                    className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              )}
            </div>
          )}

          {/* New student form (shown after clicking Add) */}
          {editingStudentId && !accommodations.find(a => a.studentId === editingStudentId) && (
            <div className="border-t border-gray-100 pt-5">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                New Accommodation — {editingStudent?.name ?? editingStudentId}
              </div>
              <div className="rounded-xl border border-gray-900 bg-gray-50 p-4 space-y-3">
                <AccommodationForm exam={exam} form={form} onChange={setForm} />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {enrolledStudents.length === 0 && !loading && (
            <p className="text-sm text-gray-400">
              No students are enrolled in <span className="font-medium">{examClass?.name ?? 'this class'}</span> yet.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); }}
        title="Remove Accommodation"
        message={`Remove the accommodation for ${deleteTarget ? studentName(deleteTarget) : 'this student'}? They will revert to the default exam settings.`}
        confirmLabel="Remove"
      />
    </>
  );
}

//  Accommodation Form Fields 

interface FormProps {
  exam: Exam;
  form: AccommodationPayload;
  onChange: React.Dispatch<React.SetStateAction<AccommodationPayload>>;
}

function AccommodationForm({ exam, form, onChange }: FormProps) {
  const set = <K extends keyof AccommodationPayload>(key: K, val: AccommodationPayload[K]) =>
    onChange(prev => ({ ...prev, [key]: val }));

  const handlePreference = (pref: string, checked: boolean) => {
    onChange(prev => ({
      ...prev,
      accessibilityPreferences: checked
        ? [...prev.accessibilityPreferences, pref]
        : prev.accessibilityPreferences.filter(p => p !== pref),
    }));
  };

  const PREFS = ['extended_breaks', 'large_text', 'screen_reader', 'reduced_distractions'];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Extra Time (minutes)
          </label>
          <input
            type="number"
            min={0}
            max={1440}
            value={form.extraTimeMinutes}
            onChange={e => set('extraTimeMinutes', Math.max(0, +e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <p className="mt-1 text-[11px] text-gray-400">Added on top of the {exam.duration} min base duration</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Attempt Limit <span className="text-gray-400">(leave blank for default 1)</span>
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.attemptLimit ?? ''}
            onChange={e => set('attemptLimit', e.target.value === '' ? null : Math.max(1, +e.target.value))}
            placeholder="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">Alternate Start</label>
            {form.alternateStartAt && (
              <button
                onClick={() => onChange(prev => ({ ...prev, alternateStartAt: null, alternateEndAt: null }))}
                className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
          <DateTimePicker
            value={toInputDatetime(form.alternateStartAt)}
            onChange={val => set('alternateStartAt', fromInputDatetime(val))}
          />
          <p className="mt-1 text-[11px] text-gray-400">Default: {new Date(exam.startDate).toLocaleString()}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Alternate End</label>
          <DateTimePicker
            value={toInputDatetime(form.alternateEndAt)}
            onChange={val => set('alternateEndAt', fromInputDatetime(val))}
          />
          <p className="mt-1 text-[11px] text-gray-400">Default: {new Date(exam.endDate).toLocaleString()}</p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Accessibility Preferences</label>
        <div className="flex flex-wrap gap-2">
          {PREFS.map(pref => {
            const checked = form.accessibilityPreferences.includes(pref);
            return (
              <label key={pref} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors select-none ${checked ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => handlePreference(pref, e.target.checked)}
                  className="sr-only"
                />
                {pref.replace(/_/g, ' ')}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
