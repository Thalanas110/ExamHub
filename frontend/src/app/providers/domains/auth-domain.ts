import type { Class } from '@/entities/class';
import type { Exam } from '@/entities/exam';
import type { Submission } from '@/entities/submission';
import type { User } from '@/entities/user';
import { dataApi } from '@/entities/admin';
import { authApi } from '@/features/auth';
import {
  clearStoredSession,
  readStoredToken,
  writeStoredToken,
} from '@/app/providers/app-context.storage';
import type { AppStateSetters } from '@/app/providers/app-context.types';

type AuthDomainDeps = AppStateSetters;

async function hydrateData(setters: AuthDomainDeps): Promise<void> {
  try {
    const snapshot = await dataApi.getAll();
    applyApiSnapshot(setters, snapshot);
  } catch (error) {
    console.error('Failed to hydrate full API data:', error);
  }
}

async function hydrateSummaryAndData(setters: AuthDomainDeps): Promise<void> {
  try {
    const summary = await dataApi.getSummary();
    setters.setSummary(summary);
  } catch (error) {
    console.error('Failed to load dashboard summary:', error);
  }

  await hydrateData(setters);
}

function applyApiSnapshot(
  setters: Pick<AuthDomainDeps, 'setUsers' | 'setClasses' | 'setExams' | 'setSubmissions'>,
  snapshot: Awaited<ReturnType<typeof dataApi.getAll>>,
) {
  setters.setUsers(snapshot.users as User[]);
  setters.setExams(snapshot.exams as unknown as Exam[]);
  setters.setClasses(snapshot.classes as Class[]);
  setters.setSubmissions(snapshot.submissions as unknown as Submission[]);
}

function clearAppState(setters: AuthDomainDeps) {
  setters.setCurrentUser(null);
  setters.setUsers([]);
  setters.setExams([]);
  setters.setClasses([]);
  setters.setSubmissions([]);
  setters.setSummary(null);
}

export function createAuthDomain(setters: AuthDomainDeps) {
  return {
    async loadFromApi() {
      const token = readStoredToken();
      if (!token) return;

      try {
        setters.setApiLoading(true);
        const summary = await dataApi.getSummary();
        setters.setSummary(summary);
        setters.setApiLoading(false);
        void hydrateData(setters);
      } catch (error) {
        console.error('Failed to load data from API on mount:', error);
        setters.setApiLoading(false);
        void hydrateData(setters);
      }
    },

    async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
      try {
        setters.setApiLoading(true);
        const result = await authApi.login({ email, password });
        writeStoredToken(result.token);
        setters.setCurrentUser(result.user as User);

        setters.setApiLoading(false);
        void hydrateSummaryAndData(setters);

        return { success: true };
      } catch (apiError) {
        console.error('API login failed:', apiError);
        clearStoredSession();
        clearAppState(setters);

        const message = apiError instanceof Error && apiError.message.trim() !== ''
          ? apiError.message
          : 'Authentication failed';

        return { success: false, error: message };
      } finally {
        setters.setApiLoading(false);
      }
    },

    logout() {
      const token = readStoredToken();
      if (token) {
        authApi.logout().catch(error => console.error('Logout API error:', error));
      }

      clearStoredSession();
      clearAppState(setters);
    },

    async register(data: Partial<User>): Promise<{ success: boolean; error?: string }> {
      try {
        setters.setApiLoading(true);
        const result = await authApi.register({
          name: data.name ?? '',
          email: data.email ?? '',
          password: data.password ?? '',
          role: data.role ?? 'student',
          department: data.department,
        });

        writeStoredToken(result.token);
        setters.setCurrentUser(result.user as User);

        setters.setApiLoading(false);
        void hydrateSummaryAndData(setters);

        return { success: true };
      } catch (apiError) {
        console.error('API register failed:', apiError);

        const message = apiError instanceof Error && apiError.message.trim() !== ''
          ? apiError.message
          : 'Registration failed';

        return { success: false, error: message };
      } finally {
        setters.setApiLoading(false);
      }
    },
  };
}
