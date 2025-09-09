import React, { useState } from 'react';
import { Invoice } from '../type';
import { useRouter } from 'next/navigation';

interface InvoiceListProps {
  invoices: Invoice[];
  isLoading: boolean;
}

const InvoiceList = ({ invoices, isLoading }: InvoiceListProps) => {
  const [filter, setFilter] = useState('all');
  const router = useRouter();
  
  const filteredInvoices = (invoices || []).filter((invoice) => {
    if (filter === 'all') {
      return true;
    }
    return invoice.status_text.toLowerCase() === filter.toLowerCase();
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-300 text-green-800';
      case 'pending':
        return 'bg-yellow-300 text-yellow-800';
      case 'failed':
        return 'bg-red-300 text-red-800';
      default:
        return 'bg-gray-300 text-gray-800';
    }
  };

  const handleNavigation = (invoiceId: string) => {
    router.push(`/dashboard/${invoiceId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="px-4 py-6 sm:px-0 mt-8">
        <div className="text-center py-8 text-black">
          <p>No invoices found. Upload your first invoice to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0 mt-8">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Invoice History</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Filter by Status:
          </label>
          <select
            id="status-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="block px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow-lg">
        <table className="w-full text-black table-auto">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm">
              <th className="py-3 px-4 uppercase font-semibold text-xs text-gray-500">Invoice Number</th>
              <th className="py-3 px-4 uppercase font-semibold text-xs text-gray-500">IRN</th>
              <th className="py-3 px-4 uppercase font-semibold text-xs text-gray-500">Platform</th>
              <th className="py-3 px-4 uppercase font-semibold text-xs text-gray-500">Current Status</th>
              <th className="py-3 px-4 uppercase font-semibold text-xs text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredInvoices.map((invoice) => (
              <tr 
                key={invoice.id} 
                className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                onClick={() => handleNavigation(invoice.id)}
              >
                <td className="py-4 px-4 font-medium">{invoice.invoice_number}</td>
                <td className="py-4 px-4 text-sm">{invoice.irn || '-'}</td>
                <td className="py-4 px-4 text-sm capitalize">{invoice.platform}</td>
                <td className="py-4 px-4 text-sm">{invoice.current_status}</td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status_text)}`}>
                    {invoice.status_text}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredInvoices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No invoices match the selected filter.</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        Showing {filteredInvoices.length} of {invoices.length} invoices
      </div>
    </div>
  );
};

export default InvoiceList;