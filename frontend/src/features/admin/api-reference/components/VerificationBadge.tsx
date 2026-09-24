import React from 'react';
import { BadgeCheck, CircleDashed, ShieldAlert } from 'lucide-react';
import type { ApiDocsVerifyCheck } from '@/entities/api-docs';

export function VerificationBadge({ check }: { check?: ApiDocsVerifyCheck }) {
  if (!check) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
        <CircleDashed className="w-3 h-3" />
        Not verified
      </span>
    );
  }

  if (check.exists) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
        <BadgeCheck className="w-3 h-3" />
        Verified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
      <ShieldAlert className="w-3 h-3" />
      Missing
    </span>
  );
}
