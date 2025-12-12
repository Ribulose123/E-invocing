'use client'
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, FileJson, Filter, X, Eye } from 'lucide-react';
import type { Invoice, InvoiceDetails, ReceivedInvoice } from '@/app/type';
import { InvoiceDetailsDialog } from './InvoiceDetailsDialog';
import { PDFPreviewModal } from './PDFPreviewModal';
import { useRouter } from 'next/navigation';
import { API_END_POINT } from '@/app/config/Api';

interface InvoiceTableProps {
  invoices: Invoice[] | ReceivedInvoice[];
  type: 'sent' | 'received';
}

export function InvoiceTable({ invoices, type }: InvoiceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [pdfPreviewInvoice, setPdfPreviewInvoice] = useState<Invoice | ReceivedInvoice | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const router = useRouter();

  const isReceivedInvoice = (invoice: Invoice | ReceivedInvoice): invoice is ReceivedInvoice => {
    return type === 'received' && 'invoiceNumber' in invoice;
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (isReceivedInvoice(invoice)) {
      const matchesSearch =
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.recipientTin.includes(searchTerm);

      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

      const matchesDateFrom = !dateFrom || new Date(invoice.date) >= new Date(dateFrom);
      const matchesDateTo = !dateTo || new Date(invoice.date) <= new Date(dateTo);

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    } else {
      const matchesSearch =
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.irn?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || invoice.status_text === statusFilter;

      // Date filtering for sent invoices using created_at
      const invoiceDate = invoice.created_at ? new Date(invoice.created_at) : null;
      const matchesDateFrom = !dateFrom || !invoiceDate || invoiceDate >= new Date(dateFrom + 'T00:00:00');
      const matchesDateTo = !dateTo || !invoiceDate || invoiceDate <= new Date(dateTo + 'T23:59:59');

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    }
  });

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || dateFrom || dateTo;

  const downloadJSON = (invoice: Invoice | ReceivedInvoice) => {
    const invoiceNumber = isReceivedInvoice(invoice) ? invoice.invoiceNumber : invoice.invoice_number;
    const dataStr = JSON.stringify(invoice, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoiceNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePDFPreview = (invoice: Invoice | ReceivedInvoice) => {
    setPdfPreviewInvoice(invoice);
    setPdfPreviewOpen(true);
  };

  const fetchInvoiceDetails = async (invoiceId: string) => {
    if (type === 'received') {
      // For received invoices, use the mock data directly
      const invoice = invoices.find(inv => isReceivedInvoice(inv) && inv.id === invoiceId);
      if (invoice && isReceivedInvoice(invoice)) {
        // Convert ReceivedInvoice to InvoiceDetails format for the dialog
        const invoiceDetails: InvoiceDetails = {
          id: invoice.id,
          invoice_number: invoice.invoiceNumber,
          irn: invoice.irn,
          platform: 'FIRS',
          current_status: invoice.status,
          created_at: invoice.date,
          status_history: invoice.statusHistory.map(h => ({
            step: h.step,
            status: h.status,
            timestamp: h.timestamp || new Date().toISOString()
          }))
        };
        setSelectedInvoice(invoiceDetails);
        setDetailsDialogOpen(true);
      }
      return;
    }

    setIsLoadingDetails(true);
    try {
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('authToken');
      
      if (!userData || !token) return;

      const user = JSON.parse(userData);
      const response = await fetch(
        API_END_POINT.INVOICE.GET_INVOICE_DETAILS.replace('{business_id}', user.id).replace('{invoice_id}', invoiceId),
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        setSelectedInvoice(result.data);
        setDetailsDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching invoice details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (type === 'received') {
      switch (status?.toLowerCase()) {
        case 'paid':
          return 'bg-green-100 text-green-800 hover:bg-green-100';
        case 'pending':
          return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
        case 'overdue':
          return 'bg-red-100 text-red-800 hover:bg-red-100';
        default:
          return 'bg-slate-100 text-slate-800 hover:bg-slate-100';
      }
    } else {
      switch (status?.toLowerCase()) {
        case 'success':
          return 'bg-green-100 text-green-800 hover:bg-green-100';
        case 'pending':
          return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
        case 'failed':
          return 'bg-red-100 text-red-800 hover:bg-red-100';
        default:
          return 'bg-slate-100 text-slate-800 hover:bg-slate-100';
      }
    }
  };

  const getStatusDisplay = (invoice: Invoice | ReceivedInvoice) => {
    if (isReceivedInvoice(invoice)) {
      return invoice.status;
    } else {
      return invoice.status_text;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 overflow-x-hidden">
      {/* Filters */}
      <Card className="p-3 sm:p-4 bg-white">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Filter className="size-3 sm:size-4 text-slate-600" />
          <span className="text-xs sm:text-sm text-slate-600">Filters</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-xs sm:text-sm px-2 sm:px-3"
            >
              <X className="size-3 sm:size-4 sm:mr-1" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {type === 'received' ? (
                  <>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Input
              type="date"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          
          <div>
            <Input
              type="date"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden bg-white">
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full min-w-[640px] sm:min-w-0">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider hidden sm:table-cell">
                  IRN
                </th>
                {type === 'received' && (
                  <>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider">
                      Sender
                    </th>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                      TIN
                    </th>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider">
                      Amount
                    </th>
                  </>
                )}
                {type === 'sent' && (
                  <>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                  </>
                )}
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs text-slate-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={type === 'received' ? 8 : 6} className="px-3 sm:px-6 py-8 sm:py-12 text-center text-slate-500 text-sm">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const invoiceNumber = isReceivedInvoice(invoice) ? invoice.invoiceNumber : invoice.invoice_number;
                  const invoiceId = invoice.id;
                  
                  return (
                    <tr key={invoiceId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadJSON(invoice)}
                            title="Download JSON"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <FileJson className="size-3 sm:size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePDFPreview(invoice)}
                            title="Preview PDF"
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <FileText className="size-3 sm:size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (type === 'received') {
                                fetchInvoiceDetails(invoiceId);
                              } else {
                                router.push(`/dashboard/${invoiceId}`);
                              }
                            }}
                            title="View Details"
                            disabled={isLoadingDetails}
                            className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Eye className="size-3 sm:size-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (type === 'received') {
                              fetchInvoiceDetails(invoiceId);
                            } else {
                              router.push(`/dashboard/${invoiceId}`);
                            }
                          }}
                          className="text-[#8B1538] hover:underline cursor-pointer text-xs sm:text-sm"
                        >
                          {invoiceNumber}
                        </button>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                        <span className="text-slate-600 text-xs sm:text-sm">{invoice.irn}</span>
                      </td>
                      {type === 'received' && isReceivedInvoice(invoice) && (
                        <>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                            {invoice.recipientName}
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-slate-600 text-xs sm:text-sm hidden lg:table-cell">
                            {invoice.recipientTin}
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-slate-600 text-xs sm:text-sm">
                            {new Date(invoice.date).toLocaleDateString()}
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                            {invoice.currency} {invoice.amount.toLocaleString()}
                          </td>
                        </>
                      )}
                      {type === 'sent' && !isReceivedInvoice(invoice) && (
                        <>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                            {invoice.platform}
                          </td>
                          <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-slate-600 text-xs sm:text-sm">
                            {invoice.created_at 
                              ? new Date(invoice.created_at).toLocaleDateString()
                              : '-'}
                          </td>
                        </>
                      )}
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <Badge className={`${getStatusColor(getStatusDisplay(invoice))} text-xs`}>
                          {getStatusDisplay(invoice)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 text-xs sm:text-sm text-slate-600 px-1">
        <span>
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </span>
        {type === 'received' && filteredInvoices.length > 0 && (
          <span className="font-medium">
            Total: {filteredInvoices
              .filter(inv => isReceivedInvoice(inv))
              .reduce((sum, inv) => sum + (inv as ReceivedInvoice).amount, 0)
              .toLocaleString()} {filteredInvoices[0] && isReceivedInvoice(filteredInvoices[0]) ? (filteredInvoices[0] as ReceivedInvoice).currency : 'USD'}
          </span>
        )}
      </div>

      {/* Invoice Details Dialog */}
      <InvoiceDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        invoice={selectedInvoice}
      />

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        invoice={pdfPreviewInvoice}
        type={type}
      />
    </div>
  );
}

