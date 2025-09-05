import React, { useState } from 'react';
import { Invoice } from '../type';
import { useRouter } from 'next/navigation';

interface InvoiceListProps {
  invoices: Invoice[];
  isLoading: boolean;
}

const InvoiceList = ({ invoices, isLoading }: InvoiceListProps) => {
  const [filter, setFilter] = useState('all');
    const router = useRouter()
  const filteredInvoices = (invoices || []).filter((invoice) => {
    if (filter === 'all') {
      return true;
    }
    return invoice.status_text.toLowerCase() === filter.toLowerCase();
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'text-green-600 font-semibold';
      case 'pending':
        return 'text-yellow-600 font-semibold';
      case 'failed':
        return 'text-red-600 font-semibold';
      default:
        return 'text-black';
    }
  };

  const handleNavigation= (invoiceId:string)=>{
    router.push(`/dashboard/${invoiceId}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading invoice...</p>
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
      <div className="mb-4">
        <label htmlFor="status-filter" className="sr-only">
          Filter by Status
        </label>
        <select
          id="status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="block w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className='overflow-x-auto bg-white p-4 rounded-lg shadow-lg'>
        <table className='w-full text-black table-auto'>
          <thead>
            <tr className='text-left text-sm border-b border-gray-200'>
              <th className='py-3 px-4 uppercase font-semibold'>Invoice Number</th>
              <th className='py-3 px-4 uppercase font-semibold'>IRN</th>
              <th className='py-3 px-4 uppercase font-semibold'>Platform</th>
              <th className='py-3 px-4 uppercase font-semibold'>Current Status</th>
              <th className='py-3 px-4 uppercase font-semibold'>Status Text</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inx) => (
              <tr key={inx.id} className='border-b border-gray-100 text-sm' onClick={()=>handleNavigation(inx.id)}>
                <td className='py-3 px-4'>{inx.invoice_number}</td>
                <td className='py-3 px-4'>{inx.irn}</td>
                <td className='py-3 px-4'>{inx.platform}</td>
                <td className='py-3 px-4'>{inx.current_status}</td>
                <td className={`py-3 px-4 ${getStatusColor(inx.status_text)}`}>
                  {inx.status_text}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceList;