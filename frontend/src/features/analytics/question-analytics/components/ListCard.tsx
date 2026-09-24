import React from 'react';
import { EmptyState } from './EmptyState';

interface ListCardProps {
  title: string;
  subtitle: string;
  items: React.ReactNode[];
}

export function ListCard({ title, subtitle, items }: ListCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="space-y-3">
        {items.length > 0 ? items : [<EmptyState key="empty" title="No matching data yet" body="Try another filter or wait for more graded attempts." />]}
      </div>
    </div>
  );
}
