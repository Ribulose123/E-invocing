import { Invoice } from "../type";
import { API_END_POINT } from "../config/Api";
import { handleUnauthorized } from "./authHelpers";

const PAGE_SIZE = 100; // fetch 100 at a time to minimize round-trips

export const fetchInvoices = async (businessId: string): Promise<Invoice[]> => {
  const token = localStorage.getItem('authToken');

  if (!token) {
    throw new Error('Authentication token not found. Please login again.');
  }

  if (!businessId) {
    throw new Error('Business ID not found. Please complete your profile.');
  }

  const endpoint = API_END_POINT.INVOICE.GET_ALL_iNVOICE;
  const headers = { Authorization: `Bearer ${token}` };

  const parseError = async (response: Response) => {
    const text = await response.text().catch(() => '');
    try {
      const parsed = JSON.parse(text);
      return parsed?.message || `Failed to fetch invoices (HTTP ${response.status})`;
    } catch {
      return `Failed to fetch invoices (HTTP ${response.status}): ${text || response.statusText}`;
    }
  };

  const asArray = (v: any): any[] => (Array.isArray(v) ? v : []);

  const buildUrl = (page: number) => {
    const u = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    u.searchParams.set('page', String(page));
    u.searchParams.set('size', String(PAGE_SIZE));
    return u.toString();
  };

  const all: Invoice[] = [];
  const seenIds = new Set<string>();
  const MAX_PAGES = 60;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await fetch(buildUrl(page), { method: 'GET', headers });

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized();
      throw new Error('Your session has expired. Please login again.');
    }

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const json = await response.json().catch(() => ({}));
    const pageData = asArray(json?.data ?? json?.results ?? json?.items ?? json?.content ?? json);

    // Empty page — we are done
    if (pageData.length === 0) break;

    let newCount = 0;
    for (const inv of pageData as Invoice[]) {
      const id = (inv as any)?.id ? String((inv as any).id) : '';
      if (!id) { all.push(inv); newCount++; continue; }
      if (!seenIds.has(id)) { seenIds.add(id); all.push(inv); newCount++; }
    }

    // All duplicates — stop
    if (newCount === 0) break;

    // Reached reported total — stop
    const total = Number(
      json?.total ?? json?.totalElements ?? json?.total_count ??
      json?.count ?? json?.pagination?.total ?? json?.meta?.total
    );
    if (Number.isFinite(total) && total > 0 && all.length >= total) break;

    // Reached reported last page — stop
    const totalPages = Number(
      json?.totalPages ?? json?.total_pages ??
      json?.pagination?.total_pages ?? json?.meta?.total_pages
    );
    if (Number.isFinite(totalPages) && totalPages > 0 && page >= totalPages) break;

    // Last page heuristic: server returned fewer items than requested
    if (pageData.length < PAGE_SIZE) break;
  }

  return all;
};