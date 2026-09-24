import React, { lazy, Suspense } from 'react';
import { RouterProvider } from 'react-router';
import { createAppRouter } from './router/app-router';
import { AppProvider } from '@/app/providers/AppProvider';

const Toaster = lazy(() => import('sonner').then(m => ({ default: m.Toaster })));

function ToasterLazy() {
  return (
    <Suspense fallback={null}>
      <Toaster position="top-right" richColors closeButton />
    </Suspense>
  );
}

const router = typeof window === 'undefined' ? null : createAppRouter();

export default function App() {
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
