import { useState } from 'react';
import { toast } from 'sonner';
import { violationApi, type ViolationRecord } from '@/entities/violation';
import type { Exam } from '@/entities/exam';

export function useExamViolations() {
  const [violationsExam, setViolationsExam] = useState<Exam | null>(null);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [violationsLoading, setViolationsLoading] = useState(false);

  const openViolations = async (exam: Exam) => {
    setViolationsExam(exam);
    setViolations([]);
    setViolationsLoading(true);
    try {
      const data = await violationApi.listByExam(exam.id);
      setViolations(data);
    } catch {
      toast.error('Could not load violations for this exam.');
    } finally {
      setViolationsLoading(false);
    }
  };

  return {
    violationsExam,
    violations,
    violationsLoading,
    openViolations,
    closeViolations: () => setViolationsExam(null),
  };
}
