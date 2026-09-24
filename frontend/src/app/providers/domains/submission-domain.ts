import type { Answer, Exam, Submission } from '../../data/types';
import { resultApi } from '../../services/api';
import type { AppDomainState, AppStateSetters, GradeAnswerInput, SubmissionPayload } from '@/app/providers/app-context.types';

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function getGrade(percentage: number) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

type SubmissionDomainDeps = Pick<AppStateSetters, 'setSubmissions'> & Pick<AppDomainState, 'exams'>;

export function createSubmissionDomain(deps: SubmissionDomainDeps) {
  return {
    submitExam(data: SubmissionPayload) {
      const exam = deps.exams.find(item => item.id === data.examId);

      const gradedAnswers: Answer[] = data.answers.map(answer => {
        const question = exam?.questions.find(item => item.id === answer.questionId);
        if (question?.type === 'mcq') {
          return {
            ...answer,
            marksAwarded: answer.answer === question.correctAnswer ? question.marks : 0,
          };
        }

        return answer;
      });

      const mcqScore = gradedAnswers.reduce((sum, answer) => sum + (answer.marksAwarded || 0), 0);
      const hasNonMcq = exam?.questions.some(question => question.type !== 'mcq');
      const submissionId = generateId();

      const newSubmission: Submission = {
        ...data,
        id: submissionId,
        answers: gradedAnswers,
        status: 'submitted',
        ...(hasNonMcq ? {} : buildAutoGradedPayload(exam, mcqScore)),
      };

      deps.setSubmissions(previous => [...previous, newSubmission]);

      resultApi.submit({
        id: submissionId,
        examId: data.examId,
        answers: data.answers.map(answer => ({ questionId: answer.questionId, answer: answer.answer })),
        submittedAt: data.submittedAt,
        questionTelemetry: data.questionTelemetry?.map(metric => ({
          questionId: metric.questionId,
          topic: metric.topic ?? null,
          timeSpentSeconds: metric.timeSpentSeconds,
          visitCount: metric.visitCount,
          answerChangeCount: metric.answerChangeCount,
        })),
      }).catch(error => console.error('submitExam API error:', error));
    },

    gradeSubmission(id: string, gradeAnswers: GradeAnswerInput[], feedback: string) {
      deps.setSubmissions(previous =>
        previous.map(submission => {
          if (submission.id !== id) return submission;

          const updatedAnswers = submission.answers.map(answer => {
            const grade = gradeAnswers.find(item => item.questionId === answer.questionId);
            return grade ? { ...answer, marksAwarded: grade.marksAwarded } : answer;
          });

          const totalScore = updatedAnswers.reduce((sum, answer) => sum + (answer.marksAwarded || 0), 0);
          const exam = deps.exams.find(item => item.id === submission.examId);
          const percentage = exam ? Math.round((totalScore / exam.totalMarks) * 100) : 0;

          return {
            ...submission,
            answers: updatedAnswers,
            totalScore,
            percentage,
            grade: getGrade(percentage),
            feedback,
            gradedAt: new Date().toISOString(),
            status: 'graded' as const,
          };
        }),
      );

      resultApi.grade(id, gradeAnswers, feedback).catch(error => console.error('gradeSubmission API error:', error));
    },
  };
}

function buildAutoGradedPayload(exam: Exam | undefined, mcqScore: number) {
  const percentage = exam ? Math.round((mcqScore / exam.totalMarks) * 100) : 0;

  return {
    totalScore: mcqScore,
    percentage,
    grade: getGrade(percentage),
    status: 'graded' as const,
    gradedAt: new Date().toISOString(),
  };
}
