import React from 'react';
import type { HttpMethod } from '@/entities/api-docs';
import { METHOD_STYLES } from '../lib/api-reference';

export function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold tracking-wide font-mono ${METHOD_STYLES[method].pill}`}>
      {method}
    </span>
  );
}
