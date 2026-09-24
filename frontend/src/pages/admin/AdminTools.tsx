import React from 'react';
import { ImportExportTools, type ImportExportToolsProps } from '@/features/import-export/ImportExportTools';

export function AdminTools(props: Omit<ImportExportToolsProps, 'audience'>) {
  return <ImportExportTools audience="admin" {...props} />;
}
