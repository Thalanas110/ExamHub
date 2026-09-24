import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'gray' | 'blue' | 'purple' | 'orange';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border border-amber-200',
  error: 'bg-rose-100 text-rose-800 border border-rose-200',
  info: 'bg-sky-100 text-sky-800 border border-sky-200',
  gray: 'bg-stone-100 text-stone-700 border border-stone-200',
  blue: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  purple: 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200',
  orange: 'bg-orange-100 text-orange-800 border border-orange-200',
};

export function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-[0.08em] uppercase ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function getGradeBadge(grade?: string): BadgeVariant {
  if (!grade) return 'gray';
  if (grade === 'A+' || grade === 'A') return 'success';
  if (grade === 'B') return 'info';
  if (grade === 'C' || grade === 'C+' || grade === 'B-') return 'warning';
  if (grade === 'D') return 'orange';
  return 'error';
}

export function getStatusBadge(status: string): BadgeVariant {
  switch (status) {
    case 'published':
      return 'blue';
    case 'completed':
      return 'success';
    case 'draft':
      return 'gray';
    case 'graded':
      return 'success';
    case 'submitted':
      return 'warning';
    default:
      return 'gray';
  }
}