'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import type { Invoice, ReceivedInvoice } from '@/app/type';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(
  () => import('../PDFViewer').then(mod => ({ default: mod.PDFViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin size-8 text-primary" />
      </div>
    )
  }
);

interface PDFPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | ReceivedInvoice | null;
  type: 'sent' | 'received';
}

// ─── Colour palette (easy to update) ────────────────────────────────────────
const BRAND = {
  primary:   [0, 128, 128] as [number, number, number],   // teal
  dark:      [30, 41, 59]  as [number, number, number],   // slate-800
  mid:       [71, 85, 105] as [number, number, number],   // slate-600
  light:     [148, 163, 184] as [number, number, number], // slate-400
  pale:      [241, 245, 249] as [number, number, number], // slate-100
  white:     [255, 255, 255] as [number, number, number],
  black:     [0, 0, 0]     as [number, number, number],
};

// ─── A4 constants ─────────────────────────────────────────────────────────────
const PAGE_W = 210; // mm
const PAGE_H = 297; // mm
const MARGIN_L = 14;
const MARGIN_R = 14;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number | string, decimals = 2) => {
  const num = typeof n === 'number' ? n : parseFloat(n) || 0;
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const rightAlign = (doc: jsPDF, text: string, x: number, y: number) => {
  const w = doc.getTextWidth(text);
  doc.text(text, x - w, y);
};

/**
 * Core PDF builder – shared by preview and download so both are identical.
 */
async function buildInvoicePDF(params: {
  invoice: Invoice | ReceivedInvoice;
  type: 'sent' | 'received';
  fullInvoiceData: any;
  displayInvoice: any;
  qrCodeToImageData: (irn: string, size?: number) => Promise<string | null>;
}): Promise<jsPDF> {
  const { invoice, type, fullInvoiceData, displayInvoice, qrCodeToImageData } = params;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const userData = localStorage.getItem('userData');
  const user = userData ? JSON.parse(userData) : null;

  const sourceData  = fullInvoiceData || displayInvoice || invoice;
  const invoiceData = (sourceData as any)?.invoice_data || sourceData;

  // ── Resolved values ─────────────────────────────────────────────────────────
  const invoiceNumber =
    type === 'received'
      ? (invoice as ReceivedInvoice)?.invoiceNumber
      : (fullInvoiceData as any)?.invoice_number ||
        (sourceData as any)?.invoice_number ||
        (invoice as Invoice)?.invoice_number ||
        invoice?.irn || 'Draft';

  const invoiceDate =
    type === 'received'
      ? (invoice as ReceivedInvoice)?.date
      : invoiceData?.issue_date ||
        (fullInvoiceData as any)?.created_at ||
        (sourceData as any)?.created_at ||
        new Date().toISOString().split('T')[0];

  const dueDate    = invoiceData?.due_date || '';
  const invoiceIrn = (fullInvoiceData as any)?.irn || (sourceData as any)?.irn || invoice?.irn || '';
  const currency   =
    type === 'received'
      ? (invoice as ReceivedInvoice)?.currency || 'NGN'
      : invoiceData?.document_currency_code || 'NGN';

  const companyName =
    user?.companyName || invoiceData?.accounting_supplier_party?.party_name || 'Your Company';
  const supplier        = invoiceData?.accounting_supplier_party;
  const supplierAddress = supplier?.postal_address;
  const customer        = invoiceData?.accounting_customer_party;
  const customerAddress = customer?.postal_address;

  // ── Subtotals ────────────────────────────────────────────────────────────────
  const subtotal =
    type === 'received'
      ? (invoice as ReceivedInvoice)?.amount || 0
      : invoiceData?.legal_monetary_total?.tax_exclusive_amount ||
        invoiceData?.legal_monetary_total?.line_extension_amount || 0;

  const taxAmount =
    type === 'received'
      ? 0
      : (invoiceData?.legal_monetary_total?.tax_inclusive_amount || 0) -
        (invoiceData?.legal_monetary_total?.tax_exclusive_amount || 0);

  const totalAmount =
    type === 'received'
      ? (invoice as ReceivedInvoice)?.amount || 0
      : invoiceData?.legal_monetary_total?.payable_amount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HEADER BAND  (full-width teal rectangle)
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 0, PAGE_W, 42, 'F');

  // Company name – top-left, white
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BRAND.white);
  doc.text(companyName, MARGIN_L, 16);

  // Company sub-details – smaller, lighter
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 235, 235);
  const supplierLines = [
    supplierAddress?.street_name,
    [supplierAddress?.city_name, supplierAddress?.postal_zone].filter(Boolean).join(', '),
    user?.tin || supplier?.tin ? `TIN: ${user?.tin || supplier?.tin}` : null,
    user?.phoneNumber || supplier?.telephone
      ? `Tel: ${user?.phoneNumber || supplier?.telephone}`
      : null,
    user?.email || supplier?.email,
  ].filter(Boolean) as string[];

  supplierLines.forEach((line, i) => doc.text(line, MARGIN_L, 22 + i * 4.5));

  // "INVOICE" label – top-right, large, white
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(...BRAND.white);
  rightAlign(doc, 'INVOICE', PAGE_W - MARGIN_R, 22);

  // Invoice meta pill under label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 235, 235);
  rightAlign(doc, `#${invoiceNumber}`, PAGE_W - MARGIN_R, 30);
  if (invoiceDate) rightAlign(doc, `Date: ${invoiceDate}`, PAGE_W - MARGIN_R, 35);
  if (dueDate)     rightAlign(doc, `Due: ${dueDate}`,      PAGE_W - MARGIN_R, 40);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. BILL TO / INVOICE DETAILS two-column block
  // ═══════════════════════════════════════════════════════════════════════════
  const colL = MARGIN_L;
  const colR = MARGIN_L + CONTENT_W / 2 + 4;
  let y = 52;

  // ── Left: Bill To ────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.primary);
  doc.text('BILL TO', colL, y);

  // underline accent
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.4);
  doc.line(colL, y + 1, colL + 18, y + 1);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.dark);
  doc.text(customer?.party_name || (invoice as ReceivedInvoice)?.supplier || 'Customer', colL, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.mid);
  const billLines = [
    customerAddress?.street_name,
    [customerAddress?.city_name, customerAddress?.postal_zone].filter(Boolean).join(', '),
    customer?.tin ? `TIN: ${customer.tin}` : null,
    customer?.email,
  ].filter(Boolean) as string[];
  billLines.forEach((line, i) => doc.text(line, colL, y + 5 + i * 4.5));

  // ── Right: Invoice details box ───────────────────────────────────────────
  const boxY  = 50;
  const boxW  = CONTENT_W / 2 - 4;
  const boxH  = invoiceIrn && invoiceIrn.length > 28 ? 44 : 32;

  doc.setFillColor(...BRAND.pale);
  doc.roundedRect(colR, boxY, boxW, boxH, 2, 2, 'F');

  const detailRows: [string, string][] = [
    ['Invoice No.', invoiceNumber],
    ['Invoice Date', invoiceDate],
    ...(dueDate ? [['Due Date', dueDate] as [string, string]] : []),
    ...(invoiceIrn ? [['IRN', invoiceIrn] as [string, string]] : []),
    ['Currency', currency],
  ];

  doc.setFontSize(8);
  const valueColLeft = colR + 36;
  const valueColWidth = boxW - 40;
  let detailY = boxY + 6;
  detailRows.forEach((row) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.mid);
    doc.text(row[0], colR + 4, detailY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.dark);
    const isIrn = row[0] === 'IRN';
    const text = row[1];
    if (isIrn && text && doc.getTextWidth(text) > valueColWidth) {
      const lines = doc.splitTextToSize(text, valueColWidth);
      lines.forEach((line: string) => {
        doc.text(line, valueColLeft, detailY);
        detailY += 4;
      });
      detailY += 1.5;
    } else {
      rightAlign(doc, text, colR + boxW - 4, detailY);
      detailY += 5.5;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ITEMS TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  y = 90;

  const tableRows: (string | number)[][] = [];

  if (type === 'received' && (invoice as ReceivedInvoice)?.items) {
    const rec = invoice as ReceivedInvoice;
    rec.items.forEach(item => {
      tableRows.push([
        item.description,
        item.quantity,
        `${rec.currency || 'NGN'} ${fmt(item.unitPrice)}`,
        `${rec.currency || 'NGN'} ${fmt(item.total)}`,
      ]);
    });
  } else if (invoiceData?.invoice_line?.length) {
    invoiceData.invoice_line.forEach((line: any) => {
      const itemName  = line.item?.name || line.description || 'N/A';
      const qty       = line.invoiced_quantity ?? line.quantity ?? '-';
      const unitPrice = line.price?.price_amount ?? line.unit_price ?? 0;
      const total     = line.line_extension_amount ??
        (typeof qty === 'number' && typeof unitPrice === 'number' ? qty * unitPrice : 0);
      tableRows.push([
        itemName,
        qty,
        `${currency} ${fmt(unitPrice)}`,
        `${currency} ${fmt(total)}`,
      ]);
    });
  }

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: BRAND.primary,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: BRAND.dark,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: BRAND.pale },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 38, halign: 'right' },
      3: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: MARGIN_L, right: MARGIN_R },
    tableLineColor: [220, 228, 235],
    tableLineWidth: 0.2,
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. TOTALS BLOCK  (right-aligned)
  // ═══════════════════════════════════════════════════════════════════════════
  const totalsX = PAGE_W - MARGIN_R - 70;
  const totalsW = 70;

  // Separator line
  doc.setDrawColor(...BRAND.light);
  doc.setLineWidth(0.3);
  doc.line(totalsX, y, PAGE_W - MARGIN_R, y);
  y += 5;

  const addTotalRow = (label: string, value: string, bold = false, highlight = false) => {
    if (highlight) {
      doc.setFillColor(...BRAND.primary);
      doc.rect(totalsX - 2, y - 4, totalsW + 2, 7, 'F');
      doc.setTextColor(...BRAND.white);
    } else {
      doc.setTextColor(bold ? BRAND.dark[0] : BRAND.mid[0],
                       bold ? BRAND.dark[1] : BRAND.mid[1],
                       bold ? BRAND.dark[2] : BRAND.mid[2]);
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.text(label, totalsX, y);
    rightAlign(doc, value, PAGE_W - MARGIN_R, y);
    y += 6;
  };

  addTotalRow('Subtotal', `${currency} ${fmt(subtotal)}`);
  if (taxAmount > 0) {
    const taxRate = subtotal > 0 ? ((taxAmount / (subtotal as number)) * 100).toFixed(1) : '0';
    addTotalRow(`VAT / Tax (${taxRate}%)`, `${currency} ${fmt(taxAmount)}`);
  }
  y += 1;
  addTotalRow(`TOTAL`, `${currency} ${fmt(totalAmount)}`, true, true);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. PAYMENT TERMS  (left side, same row as totals)
  // ═══════════════════════════════════════════════════════════════════════════
  const termsY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.primary);
  doc.text('PAYMENT TERMS', MARGIN_L, termsY);
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, termsY + 1, MARGIN_L + 32, termsY + 1);

  const paymentTerms = invoiceData?.payment_terms_note || 'Payment is due within 14 days of invoice date.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.mid);
  const termLines = doc.splitTextToSize(paymentTerms, 90);
  doc.text(termLines, MARGIN_L, termsY + 6);

  doc.setFontSize(7.5);
  doc.text(`Please make payment payable to: ${companyName}`, MARGIN_L, termsY + 6 + termLines.length * 4.5);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. QR CODE  (bottom-right)
  // ═══════════════════════════════════════════════════════════════════════════
  const qrCodeBase64 = (fullInvoiceData as any)?.qr_code || (sourceData as any)?.qr_code;
  const qrSize = 36;
  const qrX = PAGE_W - MARGIN_R - qrSize;
  const qrY = PAGE_H - 30 - qrSize;

  const placeQR = async (imgData: string) => {
    doc.addImage(imgData, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFontSize(6);
    doc.setTextColor(...BRAND.light);
    doc.text('Scan to verify', qrX + qrSize / 2 - doc.getTextWidth('Scan to verify') / 2, qrY + qrSize + 3);
    if (invoiceIrn) {
      doc.setFontSize(5.5);
      const irnLines = doc.splitTextToSize(invoiceIrn, qrSize + 10);
      doc.text(irnLines, qrX, qrY + qrSize + 7);
    }
  };

  if (qrCodeBase64) {
    try { await placeQR(`data:image/png;base64,${qrCodeBase64}`); }
    catch { if (invoiceIrn) { const d = await qrCodeToImageData(invoiceIrn, 80); if (d) await placeQR(d); } }
  } else if (invoiceIrn) {
    try { const d = await qrCodeToImageData(invoiceIrn, 80); if (d) await placeQR(d); } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. FOOTER BAND
  // ═══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...BRAND.pale);
  doc.rect(0, PAGE_H - 14, PAGE_W, 14, 'F');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.light);
  doc.text('Generated by Nexa E-Invoice System', MARGIN_L, PAGE_H - 5);
  rightAlign(doc, `Printed: ${new Date().toLocaleDateString()}`, PAGE_W - MARGIN_R, PAGE_H - 5);

  // Thin accent line above footer
  doc.setDrawColor(...BRAND.primary);
  doc.setLineWidth(0.6);
  doc.line(0, PAGE_H - 14, PAGE_W, PAGE_H - 14);

  return doc;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function PDFPreviewModal({ open, onOpenChange, invoice, type }: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl]                   = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf]       = useState(false);
  const [pdfError, setPdfError]               = useState<string | null>(null);
  const [fullInvoiceData, setFullInvoiceData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [numPages, setNumPages]               = useState<number>(0);
  const [pageNumber, setPageNumber]           = useState<number>(1);
  const [pdfRenderWidth, setPdfRenderWidth]   = useState<number>(600);
  const previewAreaRef = React.useRef<HTMLDivElement>(null);

  // ── Fetch full invoice details for sent invoices ──────────────────────────
  useEffect(() => {
    if (!open || !invoice || type !== 'sent') {
      if (open && invoice && type === 'received') setFullInvoiceData(invoice);
      return;
    }
    const fetchFullDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const token    = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        if (!token || !userData) { setFullInvoiceData(invoice); return; }

        const { API_END_POINT } = await import('@/app/config/Api');
        const endpoint = API_END_POINT.INVOICE.GET_INVOICE_DETAILS.replace('{invoice_id}', invoice.id);
        const response = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const result = await response.json();
          setFullInvoiceData(result.data || result);
        } else {
          setFullInvoiceData(invoice);
        }
      } catch { setFullInvoiceData(invoice); }
      finally { setIsLoadingDetails(false); }
    };
    fetchFullDetails();
  }, [open, invoice, type]);

  // ── Derived display invoice ───────────────────────────────────────────────
  const displayInvoice = useMemo(() => {
    if (!fullInvoiceData && !invoice) return null;
    const source      = fullInvoiceData || invoice;
    const invoiceData = (source as any)?.invoice_data || source;
    return {
      ...invoiceData,
      invoice_number: (source as any)?.invoice_number || invoiceData?.invoice_number,
      irn:            (source as any)?.irn            || invoiceData?.irn,
      platform:       (source as any)?.platform       || invoiceData?.platform,
      current_status: (source as any)?.current_status || invoiceData?.current_status,
      created_at:     (source as any)?.created_at     || invoiceData?.created_at,
      ...(source as any),
    };
  }, [fullInvoiceData, invoice]);

  // ── Fit PDF to available preview area without scrolling ──────────────────
  // A4 ratio is width:height = 1:1.414
  // We derive the render width so the full A4 page fills the container height.
  useEffect(() => {
    const update = () => {
      if (!previewAreaRef.current) return;
      const { clientWidth } = previewAreaRef.current;
      // Use the full modal width — PDF fills the modal edge-to-edge
      setPdfRenderWidth(Math.max(clientWidth, 320));
    };
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', update); };
  }, [open]);

  // ── QR code helper ────────────────────────────────────────────────────────
  const qrCodeToImageData = useCallback(async (irn: string, size = 80): Promise<string | null> => {
    try {
      const container = document.createElement('div');
      Object.assign(container.style, { position: 'absolute', left: '-9999px', top: '0', width: `${size}px`, height: `${size}px` });
      document.body.appendChild(container);

      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { document.body.removeChild(container); return null; }
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);

      const [ReactDOM, QRCodeModule] = await Promise.all([import('react-dom/client'), import('qrcode.react')]);
      const { QRCodeSVG } = QRCodeModule;
      const qrDiv = document.createElement('div');
      container.appendChild(qrDiv);
      ReactDOM.createRoot(qrDiv).render(
        React.createElement(QRCodeSVG, { value: irn, size, level: 'H', includeMargin: true })
      );

      return new Promise<string | null>(resolve => {
        setTimeout(() => {
          const svg = qrDiv.querySelector('svg');
          if (!svg) { document.body.removeChild(container); return resolve(null); }
          const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, size, size);
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);
            URL.revokeObjectURL(url);
            document.body.removeChild(container);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => { URL.revokeObjectURL(url); document.body.removeChild(container); resolve(null); };
          img.src = url;
        }, 200);
      });
    } catch { return null; }
  }, []);

  // ── Generate PDF for preview ──────────────────────────────────────────────
  const generatePDF = useCallback(async () => {
    if (!invoice || (!displayInvoice && type === 'sent')) {
      setPdfError('Invoice data not available.');
      return;
    }
    setIsLoadingPdf(true);
    setPdfError(null);
    if (pdfUrl) { try { URL.revokeObjectURL(pdfUrl); } catch {} setPdfUrl(null); }

    try {
      const doc = await buildInvoicePDF({ invoice, type, fullInvoiceData, displayInvoice, qrCodeToImageData });
      const url = URL.createObjectURL(doc.output('blob'));
      setPdfUrl(url);
    } catch (err) {
      console.error(err);
      setPdfError('Failed to generate PDF. Please try again.');
    } finally {
      setIsLoadingPdf(false);
    }
  }, [invoice, displayInvoice, type, fullInvoiceData, pdfUrl, qrCodeToImageData]);

  // ── Download handler ──────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!invoice || (!displayInvoice && type === 'sent')) return;
    try {
      const doc = await buildInvoicePDF({ invoice, type, fullInvoiceData, displayInvoice, qrCodeToImageData });
      const sourceData    = fullInvoiceData || displayInvoice || invoice;
      const invoiceData   = (sourceData as any)?.invoice_data || sourceData;
      const invoiceNumber =
        type === 'received'
          ? (invoice as ReceivedInvoice)?.invoiceNumber
          : (fullInvoiceData as any)?.invoice_number || (invoice as Invoice)?.invoice_number || invoice?.irn || 'Draft';
      doc.save(`invoice-${invoiceNumber}-${invoice?.irn || 'draft'}.pdf`);
    } catch (err) {
      console.error(err);
      setPdfError('Failed to download PDF. Please try again.');
    }
  };

  // ── Cleanup on close / invoice change ────────────────────────────────────
  useEffect(() => { return () => { if (pdfUrl) try { URL.revokeObjectURL(pdfUrl); } catch {} }; }, [pdfUrl]);

  useEffect(() => {
    if (!open) {
      if (pdfUrl) { try { URL.revokeObjectURL(pdfUrl); } catch {} setPdfUrl(null); }
      setPdfError(null); setIsLoadingPdf(false); setPageNumber(1); setNumPages(0);
    }
  }, [open]);

  useEffect(() => {
    if (!invoice) return;
    if (pdfUrl) { try { URL.revokeObjectURL(pdfUrl); } catch {} setPdfUrl(null); setPdfError(null); setIsLoadingPdf(false); setPageNumber(1); setNumPages(0); }
  }, [invoice?.id]);

  // ── Auto-generate when ready ──────────────────────────────────────────────
  useEffect(() => {
    if (open && invoice && !pdfUrl && !isLoadingPdf && !isLoadingDetails && (fullInvoiceData || type === 'received')) {
      generatePDF();
    }
  }, [open, invoice?.id, generatePDF, pdfUrl, isLoadingPdf, isLoadingDetails, fullInvoiceData, type]);

  if (!invoice) return null;

  const invoiceLabel =
    type === 'received'
      ? (invoice as ReceivedInvoice)?.invoiceNumber || 'N/A'
      : (invoice as Invoice)?.invoice_number || invoice?.irn || 'Draft';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        ── The dialog is sized to the PDF page itself.
        ── max-w-3xl (~768px) ≈ a readable A4 width; auto height hugs the content.
        ── No header, no footer, no grey surround — just the invoice.
      */}
      <DialogContent
        className="!p-0 overflow-hidden rounded-xl shadow-2xl"
        style={{ maxWidth: '780px', width: '95vw' }}
      >
        <VisuallyHidden>
          <DialogTitle>Invoice {invoiceLabel}</DialogTitle>
        </VisuallyHidden>
        {/* ── Floating action bar pinned to top of the invoice ── */}
        <div className="absolute top-3 right-10 z-10 flex items-center gap-2">
          {/* Page navigation — only shown for multi-page invoices */}
          {numPages > 1 && (
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
              <button
                className="text-white disabled:opacity-30 p-0.5"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(p => p - 1)}
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-white text-xs px-1">{pageNumber} / {numPages}</span>
              <button
                className="text-white disabled:opacity-30 p-0.5"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber(p => p + 1)}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}

          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isLoadingPdf || !pdfUrl}
            className="rounded-full shadow-lg bg-primary hover:bg-primary/90 text-white text-xs px-3 h-8"
          >
            <Download className="mr-1.5 size-3.5" /> Download
          </Button>
        </div>

        {/* ── Invoice PDF — scrollable when content is tall ── */}
        <div ref={previewAreaRef} className="w-full max-h-[85vh] overflow-y-auto overflow-x-hidden">
          {isLoadingPdf || isLoadingDetails ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="animate-spin size-10 text-primary" />
              <p className="text-sm text-muted-foreground">Preparing invoice…</p>
            </div>
          ) : pdfError ? (
            <div className="flex flex-col items-center justify-center gap-2 py-24 text-destructive">
              <AlertCircle className="size-10" />
              <p className="text-sm">{pdfError}</p>
              <Button variant="outline" size="sm" onClick={generatePDF}>Retry</Button>
            </div>
          ) : pdfUrl ? (
            <PDFViewer
              file={pdfUrl}
              pageNumber={pageNumber}
              width={pdfRenderWidth}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}