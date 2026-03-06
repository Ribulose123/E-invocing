import { Invoice } from "../type";
import { API_END_POINT } from "../config/Api";

export const fetchInvoices = async (businessId: string): Promise<Invoice[]> => {
  const token = localStorage.getItem('authToken');

  if (!token) {
    throw new Error('Authentication token not found. Please login again.');
  }

  if (!businessId) {
    throw new Error('Business ID not found. Please complete your profile.');
  }

  const endpoint = API_END_POINT.INVOICE.GET_ALL_iNVOICE.replace(
    '{business_id}',
    businessId,
  );

  console.log('[fetchInvoices] GET', endpoint);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    const responseData = await response.json();
    if (responseData && Array.isArray(responseData.data)) {
      return responseData.data;
    } else if (responseData && responseData.data === null) {
      return [];
    } else {
      throw new Error('Failed to fetch invoices: Invalid data format received.');
    }
  } else {
    const text = await response.text().catch(() => '');
    // Try to surface backend message if it's JSON
    try {
      const parsed = JSON.parse(text);
      throw new Error(parsed?.message || `Failed to fetch invoices (HTTP ${response.status})`);
    } catch {
      throw new Error(`Failed to fetch invoices (HTTP ${response.status}): ${text || response.statusText}`);
    }
  }
};

