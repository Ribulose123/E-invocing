'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  getPageButtonValues,
} from '@/utils/pagination';

export interface TablePaginationProps {
  totalItems: number;
  safePage: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
  pageSizeOptions?: readonly number[];
  className?: string;
}

export function TablePagination({
  totalItems,
  safePage,
  totalPages,
  pageSize,
  onPageSizeChange,
  onPrev,
  onNext,
  onGoToPage,
  pageSizeOptions = [...DEFAULT_PAGE_SIZE_OPTIONS],
  className = '',
}: TablePaginationProps) {
  if (totalItems <= 0) return null;

  const buttons = getPageButtonValues(safePage, totalPages);

  return (
    <div
      className={`flex flex-col gap-3 px-3 sm:px-4 py-3 border-t border-slate-200 bg-slate-50/80 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
          <span className="whitespace-nowrap">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[72px] text-slate-900 bg-white border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
          <span className="text-xs sm:text-sm text-slate-600 tabular-nums whitespace-nowrap mr-1">
            {`Page ${safePage} of ${totalPages}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            disabled={safePage <= 1}
            onClick={onPrev}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {buttons.map((item, idx) =>
              item === 'gap' ? (
                <span
                  key={`gap-${idx}`}
                  className="px-1 text-slate-400 text-xs select-none"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === safePage ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 min-w-8 px-2 text-xs tabular-nums"
                  onClick={() => onGoToPage(item)}
                  aria-label={`Page ${item}`}
                  aria-current={item === safePage ? 'page' : undefined}
                >
                  {item}
                </Button>
              )
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            disabled={safePage >= totalPages}
            onClick={onNext}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
