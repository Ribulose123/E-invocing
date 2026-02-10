import { Invoice } from "../type";
import { API_END_POINT } from "../config/Api";

export const fetchInvoices = async (): Promise<Invoice[]> => {
  const token = localStorage.getItem('authToken');

  const response = await fetch(API_END_POINT.INVOICE.GET_ALL_iNVOICE, {
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
    throw new Error('Failed to fetch invoices');
  }
};

