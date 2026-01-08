'use client'
import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import type { Invoice } from '@/app/type';

interface FailedInvoicesExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
}

// Helper function to flatten nested objects
function flattenObject(obj: any, prefix = '', result: Record<string, any> = {}): Record<string, any> {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
        flattenObject(obj[key], newKey, result);
      } else if (Array.isArray(obj[key])) {
        // Handle arrays - convert to JSON string for Excel
        result[newKey] = JSON.stringify(obj[key]);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
}

export function FailedInvoicesExportModal({
  open,
  onOpenChange,
  invoices,
}: FailedInvoicesExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [fullInvoiceData, setFullInvoiceData] = useState<Record<string, any>[]>([]);

  // Fetch full invoice details for all invoices
  useEffect(() => {
    if (!open || invoices.length === 0) return;

    const fetchAllInvoiceDetails = async () => {
      setIsLoadingData(true);
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        if (!token || !userData) {
          setIsLoadingData(false);
          return;
        }

        const user = JSON.parse(userData);
        const { API_END_POINT } = await import('@/app/config/Api');
        
        const fetchPromises = invoices.map(async (invoice) => {
          try {
            const endpoint = API_END_POINT.INVOICE.GET_INVOICE_DETAILS
              .replace('{business_id}', user.id)
              .replace('{invoice_id}', invoice.id);

            const response = await fetch(endpoint, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
              const result = await response.json();
              const invoiceData = result.data || result;
              // Merge with basic invoice info
              return {
                ...invoice,
                ...invoiceData,
                invoice_data: invoiceData.invoice_data || invoiceData,
              };
            }
            return invoice; // Return basic invoice if fetch fails
          } catch (error) {
            console.error(`Failed to fetch invoice ${invoice.id}:`, error);
            return invoice; // Return basic invoice on error
          }
        });

        const allData = await Promise.all(fetchPromises);
        setFullInvoiceData(allData);
      } catch (error) {
        console.error('Error fetching invoice details:', error);
        // Fallback to basic invoice data
        setFullInvoiceData(invoices.map(inv => ({ ...inv })));
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchAllInvoiceDetails();
  }, [open, invoices]);

  // Prepare data for Excel - flatten all invoice data
  const excelData = useMemo(() => {
    if (fullInvoiceData.length === 0) {
      // Fallback to basic data if full data not loaded
      return invoices.map((invoice) => ({
        'Invoice Number': invoice.invoice_number || '-',
        'IRN': invoice.irn || '-',
        'Platform': invoice.platform || '-',
        'Status': invoice.status_text || '-',
        'Current Status': invoice.current_status || '-',
        'Created Date': invoice.created_at
          ? new Date(invoice.created_at).toLocaleDateString()
          : '-',
      }));
    }

    // Flatten all invoice data
    return fullInvoiceData.map((invoice) => {
      const flattened = flattenObject(invoice);
      // Ensure key fields are at the top
      const ordered: Record<string, any> = {};
      const priorityFields = ['id', 'invoice_number', 'irn', 'platform', 'current_status', 'status_text', 'created_at'];
      
      // Add priority fields first
      priorityFields.forEach(field => {
        if (flattened.hasOwnProperty(field)) {
          ordered[field] = flattened[field];
          delete flattened[field];
        }
      });
      
      // Add rest of the fields
      return { ...ordered, ...flattened };
    });
  }, [fullInvoiceData, invoices]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Dynamically import xlsx
      const XLSX = await import('xlsx');
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns based on data
      const maxWidth = 50;
      const minWidth = 10;
      const columnCount = excelData.length > 0 ? Object.keys(excelData[0]).length : 0;
      const columnWidths = Array.from({ length: columnCount }, (_, i) => {
        // Calculate width based on header and sample data
        const header = Object.keys(excelData[0] || {})[i] || '';
        const sampleData = excelData.slice(0, 5).map(row => {
          const value = Object.values(row)[i];
          return value ? String(value).substring(0, 100) : '';
        });
        const maxLength = Math.max(
          header.length,
          ...sampleData.map(s => s.length)
        );
        return { wch: Math.min(Math.max(maxLength + 2, minWidth), maxWidth) };
      });
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Invoices');

      // Generate Excel file
      const fileName = `failed-invoices-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      // Close modal after successful export
      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export invoices. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="size-5 text-primary" />
            Export Failed Invoices to Excel
          </DialogTitle>
          <DialogDescription>
            Preview {invoices.length} failed invoice(s) before downloading as Excel file
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 pb-4">
          <Card className="overflow-hidden">
            {isLoadingData ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="animate-spin size-8 text-primary mx-auto mb-4" />
                  <p className="text-sm text-slate-600">Loading full invoice data...</p>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> The Excel file will contain all raw invoice data fields including nested objects (flattened), invoice line items, supplier/customer details, and all other invoice properties. 
                    {excelData.length > 0 && (
                      <span className="block mt-1">
                        Total columns: <strong>{Object.keys(excelData[0] || {}).length}</strong> | Total rows: <strong>{excelData.length}</strong>
                      </span>
                    )}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Invoice Number</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">IRN</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Platform</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Current Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Created Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Data Fields</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {excelData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                            No failed invoices to export
                          </td>
                        </tr>
                      ) : (
                        excelData.map((row, index) => {
                          const invoiceNumber = (row as any)['invoice_number'] || (row as any)['Invoice Number'] || '-';
                          const irn = (row as any)['irn'] || (row as any)['IRN'] || '-';
                          const platform = (row as any)['platform'] || (row as any)['Platform'] || '-';
                          const status = (row as any)['status_text'] || (row as any)['Status'] || '-';
                          const currentStatus = (row as any)['current_status'] || (row as any)['Current Status'] || '-';
                          const createdAt = (row as any)['created_at'] 
                            ? new Date((row as any)['created_at']).toLocaleDateString()
                            : (row as any)['Created Date'] || '-';
                          
                          return (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-4 py-3">{invoiceNumber}</td>
                              <td className="px-4 py-3">{irn}</td>
                              <td className="px-4 py-3">{platform}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  {status}
                                </span>
                              </td>
                              <td className="px-4 py-3">{currentStatus}</td>
                              <td className="px-4 py-3">{createdAt}</td>
                              <td className="px-4 py-3 text-xs text-slate-500">
                                {Object.keys(row).length} fields
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t bg-slate-50">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || excelData.length === 0 || isLoadingData}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 size-4" />
                Download Excel
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

