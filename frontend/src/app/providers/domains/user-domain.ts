import type { User } from '@/entities/user';
import { userApi } from '@/entities/user';
import type { AppDomainState, AppStateSetters } from '@/app/providers/app-context.types';

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

type UserDomainDeps = AppStateSetters & Pick<AppDomainState, 'currentUser'>;

export function createUserDomain(deps: UserDomainDeps) {
  return {
    async addUser(userData: Omit<User, 'id'>): Promise<User> {
      const newUser: User = { ...userData, id: generateId() };
      deps.setUsers(previous => [...previous, newUser]);

      try {
        const created = (await userApi.create(newUser)) as User;
        const syncedUser = { ...newUser, ...created };
        deps.setUsers(previous =>
          previous.map(user => (user.id === newUser.id ? syncedUser : user)),
        );
        return syncedUser;
      } catch (error) {
        console.error('addUser API error:', error);
        return newUser;
      }
    },

    updateUser(id: string, data: Partial<User>) {
      deps.setUsers(previous =>
        previous.map(user => (user.id === id ? { ...user, ...data } : user)),
      );

      if (deps.currentUser?.id === id) {
        deps.setCurrentUser(previous => (previous ? { ...previous, ...data } : null));
        userApi.updateProfile(data).catch(error => console.error('updateProfile API error:', error));
        return;
      }

      userApi.update(id, data).catch(error => console.error('updateUser API error:', error));
    },

    deleteUser(id: string) {
      deps.setUsers(previous => previous.filter(user => user.id !== id));
      userApi.remove(id).catch(error => console.error('deleteUser API error:', error));
    },
  };
}
