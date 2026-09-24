import { request } from '@/shared/api/request';

export interface ApiDocsVerifyCheck {
  group: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  exists: boolean;
  matchedRoute: string | null;
  canonicalPath: string;
  sourceFile: string | null;
}

export interface ApiDocsVerifyResult {
  generatedAt: string;
  summary: {
    required: number;
    matched: number;
    missing: number;
  };
  checks: ApiDocsVerifyCheck[];
}

export const docsApi = {
  verify: () => request<ApiDocsVerifyResult>('GET', '/docs/verify', undefined, true),
};
