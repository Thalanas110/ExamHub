import { request } from '@/shared/api/request';

export interface AccommodationRecord {
  examId: string;
  studentId: string;
  extraTimeMinutes: number;
  attemptLimit: number | null;
  alternateStartAt: string | null;
  alternateEndAt: string | null;
  accessibilityPreferences: string[];
}

export interface AccommodationPayload {
  extraTimeMinutes: number;
  attemptLimit: number | null;
  alternateStartAt: string | null;
  alternateEndAt: string | null;
  accessibilityPreferences: string[];
}

export const accommodationApi = {
  listByExam: (examId: string) =>
    request<AccommodationRecord[]>('GET', `/exams/${examId}/accommodations`, undefined, true),

  upsert: (examId: string, studentId: string, payload: AccommodationPayload) =>
    request<AccommodationRecord>('PUT', `/exams/${examId}/accommodations/${studentId}`, payload, true),

  remove: (examId: string, studentId: string) =>
    request<{ success: boolean }>('DELETE', `/exams/${examId}/accommodations/${studentId}`, undefined, true),
};
