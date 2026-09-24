import React from 'react';
import { ImportExportTools, type ImportExportToolsProps } from '@/features/import-export/ImportExportTools';

export function TeacherTools(props: Omit<ImportExportToolsProps, 'audience'>) {
  return <ImportExportTools audience="teacher" {...props} />;
}
