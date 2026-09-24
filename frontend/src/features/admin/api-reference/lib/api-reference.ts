import type { HttpMethod } from '@/entities/api-docs';

export const METHOD_STYLES: Record<HttpMethod, { pill: string; panel: string }> = {
  GET: {
    pill: 'bg-blue-50 text-blue-700 border border-blue-200',
    panel: 'border-l-4 border-l-blue-500',
  },
  POST: {
    pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    panel: 'border-l-4 border-l-emerald-500',
  },
  PUT: {
    pill: 'bg-amber-50 text-amber-700 border border-amber-200',
    panel: 'border-l-4 border-l-amber-500',
  },
  DELETE: {
    pill: 'bg-rose-50 text-rose-700 border border-rose-200',
    panel: 'border-l-4 border-l-rose-500',
  },
  PATCH: {
    pill: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    panel: 'border-l-4 border-l-cyan-500',
  },
};

export const GROUP_ORDER = ['Auth', 'Profile & Users', 'Exams', 'Results', 'Admin & Reporting'];

export function normalizePath(path: string): string {
  let normalized = path.trim();

  if (normalized.startsWith('/api/')) {
    normalized = normalized.slice(4);
  }

  if (normalized === '') {
    normalized = '/';
  }

  normalized = normalized.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '{param}');
  normalized = normalized.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, '{param}');

  return normalized;
}

export function endpointKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${normalizePath(path)}`;
}
