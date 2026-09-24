import type { Exam } from '@/entities/exam';
import { examApi } from '@/entities/exam';
import type { AppStateSetters } from '@/app/providers/app-context.types';

type ExamDomainDeps = Pick<AppStateSetters, 'setExams'>;

export function createExamDomain(deps: ExamDomainDeps) {
  return {
    async addExam(data: Omit<Exam, 'id' | 'createdAt'>): Promise<Exam> {
      const created = (await examApi.create(data)) as unknown as Exam;

      deps.setExams(previous => {
        const existingIndex = previous.findIndex(exam => exam.id === created.id);
        if (existingIndex >= 0) {
          return previous.map(exam => (exam.id === created.id ? created : exam));
        }

        return [...previous, created];
      });

      return created;
    },

    async updateExam(id: string, data: Partial<Exam>): Promise<Exam> {
      const updated = (await examApi.update(id, data)) as unknown as Exam;
      deps.setExams(previous => previous.map(exam => (exam.id === id ? updated : exam)));
      return updated;
    },

    async deleteExam(id: string): Promise<void> {
      await examApi.remove(id);
      deps.setExams(previous => previous.filter(exam => exam.id !== id));
    },
  };
}
