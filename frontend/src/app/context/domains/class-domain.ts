import type { Class, User } from '../../data/types';
import { classApi } from '../../services/api';
import type { AppDomainState, AppStateSetters } from '@/app/providers/app-context.types';

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

type ClassDomainDeps = AppStateSetters & Pick<AppDomainState, 'classes' | 'users'>;

export function createClassDomain(deps: ClassDomainDeps) {
  return {
    addClass(data: Omit<Class, 'id' | 'createdAt' | 'studentIds'>) {
      const newClass: Class = {
        ...data,
        id: generateId(),
        studentIds: [],
        createdAt: today(),
      };

      deps.setClasses(previous => [...previous, newClass]);
      classApi.create(newClass).catch(error => console.error('addClass API error:', error));
      return newClass;
    },

    updateClass(id: string, data: Partial<Class>) {
      deps.setClasses(previous =>
        previous.map(cls => (cls.id === id ? { ...cls, ...data } : cls)),
      );
      classApi.update(id, data).catch(error => console.error('updateClass API error:', error));
    },

    deleteClass(id: string) {
      deps.setClasses(previous => previous.filter(cls => cls.id !== id));
      classApi.remove(id).catch(error => console.error('deleteClass API error:', error));
    },

    enrollStudent(classId: string, studentId: string) {
      const cls = deps.classes.find(item => item.id === classId);
      if (!cls) return { success: false, error: 'Class not found' };
      if (cls.studentIds.includes(studentId)) return { success: false, error: 'Student already enrolled' };

      const student = deps.users.find(user => user.id === studentId);
      if (!student) return { success: false, error: 'Student not found' };
      if ((student as User).role !== 'student') return { success: false, error: 'User is not a student' };

      deps.setClasses(previous =>
        previous.map(item =>
          item.id === classId
            ? { ...item, studentIds: [...item.studentIds, studentId] }
            : item,
        ),
      );

      classApi.enroll(classId, studentId).catch(error => console.error('enrollStudent API error:', error));
      return { success: true };
    },

    removeStudentFromClass(classId: string, studentId: string) {
      deps.setClasses(previous =>
        previous.map(cls =>
          cls.id === classId
            ? { ...cls, studentIds: cls.studentIds.filter(id => id !== studentId) }
            : cls,
        ),
      );
      classApi.removeStudent(classId, studentId).catch(error => console.error('removeStudent API error:', error));
    },

    async joinClassByCode(code: string, studentId: string): Promise<{ success: boolean; error?: string }> {
      try {
        const joinedClass = (await classApi.join(code)) as Class;
        const joinedStudentIds = Array.isArray(joinedClass.studentIds) ? joinedClass.studentIds : [];
        const normalizedClass: Class = joinedStudentIds.includes(studentId)
          ? joinedClass
          : { ...joinedClass, studentIds: [...joinedStudentIds, studentId] };

        deps.setClasses(previous => {
          const exists = previous.some(cls => cls.id === normalizedClass.id);
          if (!exists) {
            return [...previous, normalizedClass];
          }

          return previous.map(cls => (cls.id === normalizedClass.id ? { ...cls, ...normalizedClass } : cls));
        });

        return { success: true };
      } catch (apiError) {
        console.error('joinClass API error:', apiError);
        const message = apiError instanceof Error && apiError.message.trim() !== ''
          ? apiError.message
          : 'Class not found. Check the code and try again.';
        return { success: false, error: message };
      }
    },

    leaveClass(classId: string, studentId: string) {
      deps.setClasses(previous =>
        previous.map(cls =>
          cls.id === classId
            ? { ...cls, studentIds: cls.studentIds.filter(id => id !== studentId) }
            : cls,
        ),
      );
      classApi.leave(classId).catch(error => console.error('leaveClass API error:', error));
    },
  };
}
