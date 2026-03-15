'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { printComponents as PrintComponents } from '@/components/printComponents';
import { API_END_POINT } from '@/app/config/Api';
import type { Invoice } from '@/app/type';
import { Loader2 } from 'lucide-react';

export default function PrintPageClient() {
  const params = useParams();
  const id = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(
      API_END_POINT.INVOICE.GET_INVOICE_DETAILS.replace('{invoice_id}', id),
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const raw = data?.data || data;
        if (raw) {
          setInvoice({
            id: raw.id || id,
            invoice_number: raw.invoice_number ?? '',
            irn: raw.irn ?? '',
            platform: raw.platform ?? '',
            current_status: raw.current_status ?? '',
            status_text: raw.status_text ?? 'pending',
            created_at: raw.created_at,
          });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center z-50"
        style={{ background: 'rgba(0,0,0,0.93)' }}
      >
        <Loader2 className="size-12 animate-spin text-white/70" />
        <p className="mt-4 text-sm text-white/60">Loading invoice…</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center z-50"
        style={{ background: 'rgba(0,0,0,0.93)' }}
      >
        <p className="text-white/80">Invoice not found.</p>
      </div>
    );
  }

  return (
    <div>
      <PrintComponents
        open={true}
        onOpenChange={() => {}}
        invoice={invoice}
        type="sent"
      />
    </div>
  );
}
