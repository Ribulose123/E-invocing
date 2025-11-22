'use client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { InvoiceDetails } from '@/app/type';

interface InvoiceDetailsDialogProps {
  invoice: InvoiceDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailsDialog({ invoice, open, onOpenChange }: InvoiceDetailsDialogProps) {
  if (!invoice) return null;

  const getStatusIcon = (status: 'success' | 'failed' | 'pending') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="size-5 text-green-600" />;
      case 'failed':
        return <XCircle className="size-5 text-red-600" />;
      case 'pending':
        return <Clock className="size-5 text-amber-500" />;
    }
  };

  const getStatusBadgeColor = (status: 'success' | 'failed' | 'pending') => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Invoice Details</DialogTitle>
        </DialogHeader>

        {/* Invoice Summary */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-2 border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600">Invoice Number</p>
              <p className="text-[#8B1538]">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">IRN</p>
              <p className="text-slate-900">{invoice.irn}</p>
            </div>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-600">Platform</p>
              <p className="text-slate-900">{invoice.platform}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Status</p>
              <p className="text-slate-900">{invoice.current_status}</p>
            </div>
          </div>
          {invoice.created_at && (
            <div>
              <p className="text-sm text-slate-600">Created At</p>
              <p className="text-slate-900">
                {new Date(invoice.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })}
              </p>
            </div>
          )}
        </div>

        {/* Status History Timeline */}
        {invoice.status_history && invoice.status_history.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg mb-4 text-slate-900">Status History</h3>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-slate-200" />
              
              {/* Timeline items */}
              <div className="space-y-6">
                {invoice.status_history.map((item, index) => (
                  <div key={index} className="relative flex gap-4 pl-8">
                    {/* Icon */}
                    <div className="absolute left-0 top-0 bg-white">
                      {getStatusIcon(item.status)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-2">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-slate-900">{item.step}</h4>
                        <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusBadgeColor(item.status)}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </div>
                      {item.timestamp && (
                        <p className="text-sm text-slate-600">
                          {new Date(item.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

