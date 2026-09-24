import { Register } from '@/features/auth/ui/Register';
import { useApp } from '@/app/providers/AppProvider';

export function RegisterPage() {
  const { register, currentUser } = useApp();
  return <Register register={register} currentUser={currentUser} />;
}
