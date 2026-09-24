import { useState } from 'react';
import { toast } from 'sonner';
import { violationApi, type ViolationRecord } from '@/entities/violation';

type SubmissionViolationsModalState = {
  examId: string;
  studentId: string;
  examTitle: string;
  studentName: string;
} | null;

export function useSubmissionViolations() {
  const [violationsModal, setViolationsModal] = useState<SubmissionViolationsModalState>(null);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [violationsLoading, setViolationsLoading] = useState(false);

  const openViolations = async (examId: string, studentId: string, examTitle: string, studentName: string) => {
    setViolationsModal({ examId, studentId, examTitle, studentName });
    setViolations([]);
    setViolationsLoading(true);
    try {
      const all = await violationApi.listByExam(examId);
      setViolations(all.filter(violation => violation.student_id === studentId));
    } catch {
      toast.error('Could not load violations.');
    } finally {
      setViolationsLoading(false);
    }
  };

  return {
    violationsModal,
    violations,
    violationsLoading,
    openViolations,
    closeViolations: () => setViolationsModal(null),
  };
}
