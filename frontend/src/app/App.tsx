import React, { useMemo, lazy, Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { createAppRouter } from './routes';
import { AppProvider } from '@/app/providers/AppProvider';

const Toaster = lazy(() => import('sonner').then(m => ({ default: m.Toaster })));

function ToasterLazy() {
  return (
    <Suspense fallback={null}>
      <Toaster position="top-right" richColors closeButton />
    </Suspense>
  );
}

function createRouter() {
  if (typeof window === 'undefined') return null;
  return createAppRouter();
}

export default function App() {
  const router = useMemo(() => createRouter(), []);

  if (!router) return null;

  return (
    <div className="app-shell">
      <AppProvider>
        <RouterProvider router={router} />
        <ToasterLazy />
      </AppProvider>
    </div>
  );
}
