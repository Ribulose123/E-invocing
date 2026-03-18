'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  computePagination,
  DEFAULT_PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/utils/pagination';

export { DEFAULT_PAGE_SIZE_OPTIONS, type PageSizeOption };

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: PageSizeOption;
}

/**
 * When `filterKey` changes (e.g. serialized filters), page resets to 1.
 * Pass a stable string like `${search}-${status}-...` from the parent.
 */
export function usePagination(
  totalCount: number,
  filterKey: string,
  options?: UsePaginationOptions
) {
  const { initialPage = 1, initialPageSize = 14 } = options ?? {};
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const { totalPages, safePage, startIndex, rangeStart, rangeEnd } = useMemo(
    () => computePagination(totalCount, page, pageSize),
    [totalCount, page, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const goToPage = useCallback(
    (p: number) => {
      const tp =
        totalCount === 0
          ? 1
          : Math.max(1, Math.ceil(totalCount / Math.max(1, pageSize)));
      setPage(Math.min(Math.max(1, Math.floor(p)), tp));
    },
    [totalCount, pageSize]
  );

  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(
    () => setPage((p) => Math.min(totalPages, p + 1)),
    [totalPages]
  );

  const setPageSizeAndReset = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    page,
    setPage,
    pageSize,
    setPageSize: setPageSizeAndReset,
    totalPages,
    safePage,
    startIndex,
    rangeStart,
    rangeEnd,
    goToPage,
    goPrev,
    goNext,
    resetToFirstPage: () => setPage(1),
  };
}
