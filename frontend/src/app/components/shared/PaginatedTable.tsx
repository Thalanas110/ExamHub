import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/ui/utils';

interface PaginatedTableProps<T> {
  items: T[];
  header: ReactNode;
  renderRow: (item: T, index: number) => ReactNode;
  emptyRow: ReactNode;
  colSpan: number;
  pageSize?: number;
  tableClassName?: string;
  bodyClassName?: string;
  minWidthClassName?: string;
}

export function PaginatedTable<T>({
  items,
  header,
  renderRow,
  emptyRow,
  colSpan,
  pageSize = 5,
  tableClassName,
  bodyClassName,
  minWidthClassName = 'min-w-[760px]',
}: PaginatedTableProps<T>) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(value => Math.min(value, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [currentPage, items, pageSize]);

  const showingStart = items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingEnd = Math.min(currentPage * pageSize, items.length);

  return (
    <>
      <div className="data-table-scroll overflow-x-auto">
        <table className={cn('w-full text-sm', minWidthClassName, tableClassName)}>
          {header}
          <tbody className={bodyClassName}>
            {items.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>{emptyRow}</td>
              </tr>
            ) : (
              pagedItems.map((item, index) => renderRow(item, (currentPage - 1) * pageSize + index))
            )}
          </tbody>
        </table>
      </div>

      {items.length > pageSize && (
        <div className="flex flex-col gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {showingStart}-{showingEnd} of {items.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(value => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="min-w-12 text-center font-semibold text-gray-600">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(value => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-2.5 font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
