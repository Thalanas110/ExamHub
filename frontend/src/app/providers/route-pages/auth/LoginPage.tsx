import { Login } from '@/features/auth/ui/Login';
import { useApp } from '@/app/providers/AppProvider';

export function LoginPage() {
  const { login, currentUser } = useApp();
  return <Login login={login} currentUser={currentUser} />;
}
