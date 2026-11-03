import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface PaginationControlsProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 250],
  className = ''
}) => {
  if (totalItems <= 0) return null;

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers array with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push('...');
      
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      
      if (safePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs font-mono text-slate-700 select-none", className)}>
      {/* Info & Page Size Selector */}
      <div className="flex items-center gap-4">
        <span className="font-medium text-slate-600">
          Showing <strong className="text-slate-900">{startItem.toLocaleString()}</strong> to{' '}
          <strong className="text-slate-900">{endItem.toLocaleString()}</strong> of{' '}
          <strong className="text-slate-900">{totalItems.toLocaleString()}</strong> records
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value={999999}>All ({totalItems})</option>
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={safePage === 1}
            className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="h-3.5 w-3.5 text-slate-600" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1}
            className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1 px-1">
            {getPageNumbers().map((num, idx) => {
              if (num === '...') {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400">
                    ...
                  </span>
                );
              }

              const pageNum = num as number;
              const isActive = pageNum === safePage;

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    "min-w-[28px] h-7 px-1.5 rounded font-bold text-xs transition-colors cursor-pointer",
                    isActive
                      ? "bg-[#D94B5A] text-white shadow-2xs border border-[#D94B5A]"
                      : "bg-white text-[#262626] border border-[#CBD5E1] hover:bg-[#FFF2CC]"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage === totalPages}
            className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
            title="Next Page"
          >
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={safePage === totalPages}
            className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="h-3.5 w-3.5 text-slate-600" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PaginationControls;
