import React from 'react';

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
      <div className="text-sm font-semibold text-gray-700">{title}</div>
      <div className="mt-1 text-sm text-gray-400">{body}</div>
    </div>
  );
}
