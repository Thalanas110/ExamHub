export interface EndpointCodeReference {
  file: string;
  line: number;
  detail: string;
}

export interface EndpointCodeDependency {
  backend: EndpointCodeReference[];
  frontend: EndpointCodeReference[];
}

export const ENDPOINT_CODE_MAP: Record<string, EndpointCodeDependency> = {
  'auth-register': {
    backend: [
      { file: 'backend/src/Routing/Routes/AuthRoutes.php', line: 15, detail: 'Route registration: POST /auth/register' },
      { file: 'backend/src/Controllers/AuthController.php', line: 20, detail: 'Controller handler: register()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/auth.service.ts', line: 32, detail: 'API client call: authApi.register()' },
      { file: 'frontend/src/app/context/domains/auth-domain.ts', line: 86, detail: 'Domain usage: signup flow' },
    ],
  },
  'auth-login': {
    backend: [
      { file: 'backend/src/Routing/Routes/AuthRoutes.php', line: 16, detail: 'Route registration: POST /auth/login' },
      { file: 'backend/src/Controllers/AuthController.php', line: 30, detail: 'Controller handler: login()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/auth.service.ts', line: 35, detail: 'API client call: authApi.login()' },
      { file: 'frontend/src/app/context/domains/auth-domain.ts', line: 50, detail: 'Domain usage: signin flow' },
    ],
  },
  'profile-get': {
    backend: [
      { file: 'backend/src/Routing/Routes/ProfileRoutes.php', line: 15, detail: 'Route registration: GET /users/profile' },
      { file: 'backend/src/Controllers/ProfileController.php', line: 20, detail: 'Controller handler: getProfile()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/user.service.ts', line: 16, detail: 'API client call: userApi.getProfile()' },
    ],
  },
  'profile-put': {
    backend: [
      { file: 'backend/src/Routing/Routes/ProfileRoutes.php', line: 16, detail: 'Route registration: PUT /users/profile' },
      { file: 'backend/src/Controllers/ProfileController.php', line: 32, detail: 'Controller handler: updateProfile()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/user.service.ts', line: 19, detail: 'API client call: userApi.updateProfile()' },
      { file: 'frontend/src/app/context/domains/user-domain.ts', line: 37, detail: 'Domain usage: profile update for current user' },
    ],
  },
  'exams-post': {
    backend: [
      { file: 'backend/src/Routing/Routes/ExamRoutes.php', line: 16, detail: 'Route registration: POST /exams' },
      { file: 'backend/src/Controllers/ExamsController.php', line: 36, detail: 'Controller handler: createExam()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/exam.service.ts', line: 49, detail: 'API client call: examApi.create()' },
      { file: 'frontend/src/app/context/domains/exam-domain.ts', line: 10, detail: 'Domain usage: addExam()' },
    ],
  },
  'exams-get': {
    backend: [
      { file: 'backend/src/Routing/Routes/ExamRoutes.php', line: 15, detail: 'Route registration: GET /exams' },
      { file: 'backend/src/Controllers/ExamsController.php', line: 27, detail: 'Controller handler: getExams()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/exam.service.ts', line: 52, detail: 'API client call: examApi.getAll()' },
    ],
  },
  'exams-get-id': {
    backend: [
      { file: 'backend/src/Routing/Routes/ExamRoutes.php', line: 21, detail: 'Route registration: GET /exams/:id' },
      { file: 'backend/src/Controllers/ExamsController.php', line: 46, detail: 'Controller handler: getExamById()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/exam.service.ts', line: 55, detail: 'API client call: examApi.getById()' },
    ],
  },
  'results-submit': {
    backend: [
      { file: 'backend/src/Routing/Routes/ResultRoutes.php', line: 16, detail: 'Route registration: POST /results/submit' },
      { file: 'backend/src/Controllers/ResultsController.php', line: 30, detail: 'Controller handler: submitResult()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/result.service.ts', line: 33, detail: 'API client call: resultApi.submit()' },
      { file: 'frontend/src/app/context/domains/submission-domain.ts', line: 51, detail: 'Domain usage: submitExam()' },
    ],
  },
  'results-student': {
    backend: [
      { file: 'backend/src/Routing/Routes/ResultRoutes.php', line: 17, detail: 'Route registration: GET /results/student/:id' },
      { file: 'backend/src/Controllers/ResultsController.php', line: 40, detail: 'Controller handler: getResultsByStudent()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/result.service.ts', line: 36, detail: 'API client call: resultApi.getByStudent()' },
    ],
  },
  'admin-exams': {
    backend: [
      { file: 'backend/src/Routing/Routes/AdminRoutes.php', line: 15, detail: 'Route registration: GET /admin/exams' },
      { file: 'backend/src/Controllers/AdminController.php', line: 21, detail: 'Controller handler: getAdminExams()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/admin.service.ts', line: 94, detail: 'API client call: adminApi.getExams()' },
    ],
  },
  'admin-results': {
    backend: [
      { file: 'backend/src/Routing/Routes/AdminRoutes.php', line: 16, detail: 'Route registration: GET /admin/results' },
      { file: 'backend/src/Controllers/AdminController.php', line: 29, detail: 'Controller handler: getAdminResults()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/admin.service.ts', line: 102, detail: 'API client call: adminApi.getResults()' },
    ],
  },
  'reports-performance': {
    backend: [
      { file: 'backend/src/Routing/Routes/ReportRoutes.php', line: 15, detail: 'Route registration: GET /reports/exam-performance' },
      { file: 'backend/src/Controllers/ReportsController.php', line: 19, detail: 'Controller handler: getExamPerformance()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/report.service.ts', line: 82, detail: 'API client call: reportApi.getExamPerformance()' },
    ],
  },
  'reports-passfail': {
    backend: [
      { file: 'backend/src/Routing/Routes/ReportRoutes.php', line: 16, detail: 'Route registration: GET /reports/pass-fail' },
      { file: 'backend/src/Controllers/ReportsController.php', line: 28, detail: 'Controller handler: getPassFail()' },
    ],
    frontend: [
      { file: 'frontend/src/entities/report.service.ts', line: 85, detail: 'API client call: reportApi.getPassFail()' },
    ],
  },
};
