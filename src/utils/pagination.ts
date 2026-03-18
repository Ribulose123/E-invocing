/**
 * Pure pagination helpers — usable outside React (tests, server).
 */

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 14, 25, 50, 100] as const;
export type PageSizeOption = (typeof DEFAULT_PAGE_SIZE_OPTIONS)[number];

export interface PaginationState {
  totalPages: number;
  safePage: number;
  startIndex: number;
  rangeStart: number;
  rangeEnd: number;
}

export function computePagination(
  totalItems: number,
  page: number,
  pageSize: number
): PaginationState {
  const size = Math.max(1, pageSize);
  const totalPages =
    totalItems === 0 ? 1 : Math.max(1, Math.ceil(totalItems / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * size;
  const rangeStart = totalItems === 0 ? 0 : startIndex + 1;
  const rangeEnd = Math.min(startIndex + size, totalItems);
  return { totalPages, safePage, startIndex, rangeStart, rangeEnd };
}

export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const { startIndex } = computePagination(items.length, page, pageSize);
  return items.slice(startIndex, startIndex + Math.max(1, pageSize));
}

/** Values to render as page buttons: numbers or gap for "…" */
export function getPageButtonValues(
  currentPage: number,
  totalPages: number
): (number | 'gap')[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>();
  set.add(1);
  set.add(totalPages);
  for (let d = -2; d <= 2; d++) {
    const p = currentPage + d;
    if (p >= 1 && p <= totalPages) set.add(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('gap');
    out.push(sorted[i]);
  }
  return out;
}
