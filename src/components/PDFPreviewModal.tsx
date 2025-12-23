'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, QrCode, FileText, Loader2, ChevronLeft, ChevronRight, AlertCircle, List } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Invoice, ReceivedInvoice } from '@/app/type';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dynamic from 'next/dynamic';

// Dynamically import react-pdf components to avoid SSR issues with DOMMatrix
const PDFViewer = dynamic(
  () => import('./PDFViewer').then(mod => ({ default: mod.PDFViewer })),
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

export function PDFPreviewModal({ open, onOpenChange, invoice, type }: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [fullInvoiceData, setFullInvoiceData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'pdf' | 'qr'>('preview');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  // Fetch full invoice details if we only have basic invoice info
  useEffect(() => {
    if (!open || !invoice || type !== 'sent') return;
    
    // Check if we have full invoice data (has invoice_data or invoice_line)
    const hasFullData = (invoice as any).invoice_data || (invoice as any).invoice_line || (invoice as any).accounting_supplier_party;
    if (hasFullData) {
      setFullInvoiceData(invoice);
      return;
    }

    // Fetch full invoice details
    const fetchFullDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        if (!token || !userData) return;

        const user = JSON.parse(userData);
        const { API_END_POINT } = await import('@/app/config/Api');
        const endpoint = API_END_POINT.INVOICE.GET_INVOICE_DETAILS
          .replace('{business_id}', user.id)
          .replace('{invoice_id}', invoice.id);

        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const result = await response.json();
          // The API returns { data: { invoice_data: {...}, invoice_number, irn, ... } }
          setFullInvoiceData(result.data || result);
        }
      } catch (error) {
        console.error('Failed to fetch invoice details:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchFullDetails();
  }, [open, invoice, type]);

  // Use full invoice data if available, otherwise use basic invoice
  // Handle nested structure: invoice_data contains the detailed invoice info
  const displayInvoice = useMemo(() => {
    if (!fullInvoiceData && !invoice) return null;
    
    const source = fullInvoiceData || invoice;
    const invoiceData = (source as any)?.invoice_data || source;
    
    // Merge top-level metadata with invoice_data for easier access
    return {
      ...invoiceData,
      // Top-level fields override invoice_data fields
      invoice_number: (source as any)?.invoice_number || invoiceData?.invoice_number,
      irn: (source as any)?.irn || invoiceData?.irn,
      platform: (source as any)?.platform || invoiceData?.platform,
      current_status: (source as any)?.current_status || invoiceData?.current_status,
      created_at: (source as any)?.created_at || invoiceData?.created_at,
    };
  }, [fullInvoiceData, invoice]);

  // Extract dynamic headers from invoice_line
  const tableData = useMemo(() => {
    if (!displayInvoice) return { headers: [], rows: [] };
    
    const invoiceData = displayInvoice as any;
    
    // For received invoices, use items array
    if (type === 'received' && (invoice as ReceivedInvoice)?.items) {
      const receivedInvoice = invoice as ReceivedInvoice;
      return {
        headers: [
          { key: 'description', label: 'Description' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'unitPrice', label: 'Unit Price' },
          { key: 'total', label: 'Total' }
        ],
        rows: receivedInvoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        }))
      };
    }
    
    // For sent invoices, use invoice_line from invoice_data
    if (!invoiceData?.invoice_line || !invoiceData.invoice_line.length) {
      return { headers: [], rows: [] };
    }
    
    // Get all unique keys that aren't objects (primitives only)
    const primitiveHeaders = Object.keys(invoiceData.invoice_line[0]).filter(
      key => typeof invoiceData.invoice_line[0][key] !== 'object'
    );

    const formatLabel = (str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return {
      headers: primitiveHeaders.map(key => ({ key, label: formatLabel(key) })),
      rows: invoiceData.invoice_line
    };
  }, [displayInvoice, invoice, type]);

  useEffect(() => {
    const updateDimensions = () => {
      // Calculated width based on modal width (max-w-5xl = 1024px) minus padding
      const modalMaxWidth = 1024; // max-w-5xl
      const padding = 80; // px-6 on each side (24px * 2) + border + some margin
      const calculatedWidth = Math.min(window.innerWidth - padding, modalMaxWidth - padding);
      setContainerWidth(Math.max(calculatedWidth, 400)); // Minimum width of 400px
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const generatePDF = useCallback(async () => {
    if (!invoice || !displayInvoice) {
      setPdfError('Invoice data not available. PDF cannot be generated.');
      setIsLoadingPdf(false);
      return;
    }
    
    setIsLoadingPdf(true);
    setPdfError(null);

    // Clean up any existing blob URL before creating a new one
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : null;
      
      const doc = new jsPDF();
      const invoiceData = displayInvoice as any;
      
      // Get invoice details - use top-level fields first, then fallback to invoice_data
      const invoiceNumber = type === 'received' 
        ? (invoice as ReceivedInvoice)?.invoiceNumber 
        : (fullInvoiceData as any)?.invoice_number || (invoice as Invoice)?.invoice_number || invoice?.irn || 'Draft';
      
      const invoiceDate = type === 'received' 
        ? (invoice as ReceivedInvoice)?.date 
        : invoiceData?.issue_date || (fullInvoiceData as any)?.created_at || new Date().toISOString().split('T')[0];
      
      const dueDate = invoiceData?.due_date || '';
      const invoiceIrn = (fullInvoiceData as any)?.irn || invoice?.irn || '';
      
      // Company Information (Top Left)
      let yPos = 20;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      // Company Name
      const companyName = user?.companyName || invoiceData?.accounting_supplier_party?.party_name || 'Your Company Inc.';
      doc.text(companyName, 20, yPos);
      
      // Company Address (if available from supplier party)
      const supplier = invoiceData?.accounting_supplier_party;
      const supplierAddress = supplier?.postal_address;
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      if (supplierAddress?.street_name) {
        doc.text(supplierAddress.street_name, 20, yPos);
        yPos += 5;
      }
      if (supplierAddress?.city_name || supplierAddress?.postal_zone) {
        const cityState = [
          supplierAddress.city_name,
          supplierAddress.postal_zone
        ].filter(Boolean).join(', ');
        doc.text(cityState, 20, yPos);
        yPos += 5;
      }
      
      // Add TIN and Phone if available
      if (user?.tin || supplier?.tin) {
        doc.text(`TIN: ${user?.tin || supplier?.tin}`, 20, yPos);
        yPos += 5;
      }
      if (user?.phoneNumber || supplier?.telephone) {
        doc.text(`Phone: ${user?.phoneNumber || supplier?.telephone}`, 20, yPos);
        yPos += 5;
      }
      if (user?.email || supplier?.email) {
        doc.text(user?.email || supplier?.email || '', 20, yPos);
        yPos += 5;
      }
      
      // Invoice Title (Center, Large)
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 128); // Teal color similar to image
      const titleY = 25;
      const pageWidth = doc.internal.pageSize.width;
      const titleText = 'INVOICE';
      const titleWidth = doc.getTextWidth(titleText);
      doc.text(titleText, (pageWidth - titleWidth) / 2, titleY);
      
      // Invoice Details (Top Right)
      yPos = 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const rightX = pageWidth - 60;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice #', rightX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(invoiceNumber, rightX + 30, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice date', rightX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(invoiceDate, rightX + 30, yPos);
      
      if (dueDate) {
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Due date', rightX, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(dueDate, rightX + 30, yPos);
      }
      
      if (invoiceIrn) {
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('IRN', rightX, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(invoiceIrn, rightX + 30, yPos);
      }
      
      // Bill To Section (Left Side)
      yPos = 50;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To', 20, yPos);
      
      const customer = invoiceData?.accounting_customer_party;
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      if (customer?.party_name) {
        doc.text(customer.party_name, 20, yPos);
        yPos += 5;
      }
      
      const customerAddress = customer?.postal_address;
      if (customerAddress?.street_name) {
        doc.text(customerAddress.street_name, 20, yPos);
        yPos += 5;
      }
      if (customerAddress?.city_name || customerAddress?.postal_zone) {
        const cityState = [
          customerAddress.city_name,
          customerAddress.postal_zone
        ].filter(Boolean).join(', ');
        doc.text(cityState, 20, yPos);
        yPos += 5;
      }
      if (customer?.tin) {
        doc.text(`TIN: ${customer.tin}`, 20, yPos);
        yPos += 5;
      }
      if (customer?.email) {
        doc.text(customer.email, 20, yPos);
        yPos += 5;
      }
      
      yPos += 10;
      
      // Items Table
      const tableRows: any[] = [];
      const tableHeaders: string[] = ['QTY', 'Description', 'Unit Price', 'Amount'];
      
      if (type === 'received' && (invoice as ReceivedInvoice)?.items) {
        const receivedInv = invoice as ReceivedInvoice;
        receivedInv.items.forEach(item => {
          tableRows.push([
            item.quantity.toString(),
            item.description,
            `${receivedInv.currency || 'USD'} ${item.unitPrice.toFixed(2)}`,
            `${receivedInv.currency || 'USD'} ${item.total.toFixed(2)}`
          ]);
        });
      } else if (invoiceData?.invoice_line && invoiceData.invoice_line.length > 0) {
        invoiceData.invoice_line.forEach((line: any) => {
          const itemName = line.item?.name || line.description || 'N/A';
          const quantity = line.invoiced_quantity || line.quantity || '-';
          const unitPrice = line.price?.price_amount || line.unit_price || '0.00';
          const total = line.line_extension_amount || (typeof quantity === 'number' && typeof unitPrice === 'number' ? quantity * unitPrice : '0.00');
          const currency = invoiceData.document_currency_code || 'USD';
          
          tableRows.push([
            quantity.toString(),
            itemName,
            `${currency} ${typeof unitPrice === 'number' ? unitPrice.toFixed(2) : unitPrice}`,
            `${currency} ${typeof total === 'number' ? total.toFixed(2) : total}`
          ]);
        });
      }
      
      if (tableRows.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [tableHeaders],
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [0, 128, 128], textColor: 255 }, // Teal header like image
          styles: { fontSize: 9 },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 20 }, // QTY
            1: { cellWidth: 'auto' }, // Description
            2: { cellWidth: 40, halign: 'right' }, // Unit Price
            3: { cellWidth: 40, halign: 'right' } // Amount
          }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Summary Section (Subtotal, Tax, Total)
      const currency = type === 'received' 
        ? (invoice as ReceivedInvoice)?.currency || 'USD'
        : invoiceData?.document_currency_code || 'USD';
      
      const subtotal = type === 'received'
        ? (invoice as ReceivedInvoice)?.amount || 0
        : invoiceData?.legal_monetary_total?.tax_exclusive_amount || invoiceData?.legal_monetary_total?.line_extension_amount || 0;
      
      const taxAmount = type === 'received'
        ? 0
        : (invoiceData?.legal_monetary_total?.tax_inclusive_amount || 0) - (invoiceData?.legal_monetary_total?.tax_exclusive_amount || 0);
      
      const totalAmount = type === 'received'
        ? (invoice as ReceivedInvoice)?.amount || 0
        : invoiceData?.legal_monetary_total?.payable_amount || 0;
      
      const summaryX = pageWidth - 60;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      doc.text('Subtotal', summaryX - 30, yPos);
      doc.text(`${currency} ${typeof subtotal === 'number' ? subtotal.toFixed(2) : subtotal}`, summaryX, yPos);
      yPos += 6;
      
      if (taxAmount > 0) {
        const taxRate = subtotal > 0 ? ((taxAmount / subtotal) * 100).toFixed(1) : '0';
        doc.text(`Sales Tax (${taxRate}%)`, summaryX - 30, yPos);
        doc.text(`${currency} ${typeof taxAmount === 'number' ? taxAmount.toFixed(2) : taxAmount}`, summaryX, yPos);
        yPos += 6;
      }
      
      // Total with teal background effect
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(0, 128, 128);
      doc.rect(summaryX - 50, yPos - 5, 50, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Total (USD)', summaryX - 45, yPos);
      doc.text(`${currency} ${typeof totalAmount === 'number' ? totalAmount.toFixed(2) : totalAmount}`, summaryX, yPos);
      
      yPos += 15;
      
      // Terms and Conditions
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 128);
      doc.setFontSize(10);
      doc.text('Terms and Conditions', 20, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      
      const paymentTerms = invoiceData?.payment_terms_note || `Payment is due in 14 days`;
      doc.text(paymentTerms, 20, yPos);
      yPos += 5;
      doc.text(`Please make checks payable to: ${companyName}`, 20, yPos);
      
      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Generated by eInvoice Pro System', 20, pageHeight - 10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, summaryX, pageHeight - 10);
      
      // Generate blob URL for preview
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      
    } catch (err) {
      console.error('PDF generation error:', err);
      setPdfError('Failed to generate PDF. Please try again.');
    } finally {
      setIsLoadingPdf(false);
    }
  }, [invoice, displayInvoice, type]);

  // Clean up blob URL when component unmounts or pdfUrl changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        try {
          URL.revokeObjectURL(pdfUrl);
        } catch (e) {
          // Ignore errors if URL is already revoked
          console.warn('Error revoking blob URL:', e);
        }
      }
    };
  }, [pdfUrl]);

  // Reset PDF state when modal closes
  useEffect(() => {
    if (!open) {
      // Clean up when modal closes
      if (pdfUrl) {
        try {
          URL.revokeObjectURL(pdfUrl);
        } catch (e) {
          // Ignore errors if URL is already revoked
        }
        setPdfUrl(null);
      }
      setPdfError(null);
      setIsLoadingPdf(false);
      setPageNumber(1);
      setNumPages(0);
      setActiveTab('preview');
    }
  }, [open]); // Remove pdfUrl from dependencies to avoid conflicts

  // Reset PDF URL when invoice changes
  useEffect(() => {
    if (!invoice) return;
    
    const currentInvoiceId = invoice?.id || (invoice as any)?.invoice_number || (invoice as ReceivedInvoice)?.invoiceNumber;
    if (currentInvoiceId && pdfUrl) {
      try {
        URL.revokeObjectURL(pdfUrl);
      } catch (e) {
        // Ignore errors if URL is already revoked
      }
      setPdfUrl(null);
      setPdfError(null);
      setIsLoadingPdf(false);
      setPageNumber(1);
      setNumPages(0);
    }
  }, [invoice?.id, invoice]);

  // Generate PDF when needed
  useEffect(() => {
    if (open && invoice && activeTab === 'pdf' && !pdfUrl && !isLoadingPdf) {
      generatePDF();
    }
  }, [open, invoice?.id, activeTab, generatePDF, pdfUrl, isLoadingPdf]);

  const handleDownloadPDF = async () => {
    if (!invoice || !displayInvoice) return;
    
    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : null;
      
      const doc = new jsPDF();
      const invoiceData = displayInvoice as any;
      
      // Get invoice details
      const invoiceNumber = type === 'received' 
        ? (invoice as ReceivedInvoice)?.invoiceNumber 
        : (invoice as Invoice)?.invoice_number || invoice?.irn || 'Draft';
      
      const invoiceDate = type === 'received' 
        ? (invoice as ReceivedInvoice)?.date 
        : invoiceData?.issue_date || invoiceData?.created_at || new Date().toISOString().split('T')[0];
      
      const dueDate = invoiceData?.due_date || '';
      const pageWidth = doc.internal.pageSize.width;
      
      // Company Information (Top Left)
      let yPos = 20;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      // Company Name
      const companyName = user?.companyName || invoiceData?.accounting_supplier_party?.party_name || 'Your Company Inc.';
      doc.text(companyName, 20, yPos);
      
      // Company Address (if available from supplier party)
      const supplier = invoiceData?.accounting_supplier_party;
      const supplierAddress = supplier?.postal_address;
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      if (supplierAddress?.street_name) {
        doc.text(supplierAddress.street_name, 20, yPos);
        yPos += 5;
      }
      if (supplierAddress?.city_name || supplierAddress?.postal_zone) {
        const cityState = [
          supplierAddress.city_name,
          supplierAddress.postal_zone
        ].filter(Boolean).join(', ');
        doc.text(cityState, 20, yPos);
        yPos += 5;
      }
      
      // Add TIN and Phone if available
      if (user?.tin || supplier?.tin) {
        doc.text(`TIN: ${user?.tin || supplier?.tin}`, 20, yPos);
        yPos += 5;
      }
      if (user?.phoneNumber || supplier?.telephone) {
        doc.text(`Phone: ${user?.phoneNumber || supplier?.telephone}`, 20, yPos);
        yPos += 5;
      }
      if (user?.email || supplier?.email) {
        doc.text(user?.email || supplier?.email || '', 20, yPos);
        yPos += 5;
      }
      
      // Invoice Title (Center, Large)
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 128); // Teal color similar to image
      const titleY = 25;
      const titleText = 'INVOICE';
      const titleWidth = doc.getTextWidth(titleText);
      doc.text(titleText, (pageWidth - titleWidth) / 2, titleY);
      
      // Invoice Details (Top Right)
      yPos = 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const rightX = pageWidth - 60;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice #', rightX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(invoiceNumber, rightX + 30, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice date', rightX, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(invoiceDate, rightX + 30, yPos);
      
      if (dueDate) {
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Due date', rightX, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(dueDate, rightX + 30, yPos);
      }
      
      if (invoice?.irn) {
        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('IRN', rightX, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.irn, rightX + 30, yPos);
      }
      
      // Bill To Section (Left Side)
      yPos = 50;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To', 20, yPos);
      
      const customer = invoiceData?.accounting_customer_party;
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      if (customer?.party_name) {
        doc.text(customer.party_name, 20, yPos);
        yPos += 5;
      }
      
      const customerAddress = customer?.postal_address;
      if (customerAddress?.street_name) {
        doc.text(customerAddress.street_name, 20, yPos);
        yPos += 5;
      }
      if (customerAddress?.city_name || customerAddress?.postal_zone) {
        const cityState = [
          customerAddress.city_name,
          customerAddress.postal_zone
        ].filter(Boolean).join(', ');
        doc.text(cityState, 20, yPos);
        yPos += 5;
      }
      if (customer?.tin) {
        doc.text(`TIN: ${customer.tin}`, 20, yPos);
        yPos += 5;
      }
      if (customer?.email) {
        doc.text(customer.email, 20, yPos);
        yPos += 5;
      }
      
      yPos += 10;
      
      // Items Table
      const tableRows: any[] = [];
      const tableHeaders: string[] = ['QTY', 'Description', 'Unit Price', 'Amount'];
      
      if (type === 'received' && (invoice as ReceivedInvoice)?.items) {
        const receivedInv = invoice as ReceivedInvoice;
        receivedInv.items.forEach(item => {
          tableRows.push([
            item.quantity.toString(),
            item.description,
            `${receivedInv.currency || 'USD'} ${item.unitPrice.toFixed(2)}`,
            `${receivedInv.currency || 'USD'} ${item.total.toFixed(2)}`
          ]);
        });
      } else if (invoiceData?.invoice_line && invoiceData.invoice_line.length > 0) {
        invoiceData.invoice_line.forEach((line: any) => {
          const itemName = line.item?.name || line.description || 'N/A';
          const quantity = line.invoiced_quantity || line.quantity || '-';
          const unitPrice = line.price?.price_amount || line.unit_price || '0.00';
          const total = line.line_extension_amount || (typeof quantity === 'number' && typeof unitPrice === 'number' ? quantity * unitPrice : '0.00');
          const currency = invoiceData.document_currency_code || 'USD';
          
          tableRows.push([
            quantity.toString(),
            itemName,
            `${currency} ${typeof unitPrice === 'number' ? unitPrice.toFixed(2) : unitPrice}`,
            `${currency} ${typeof total === 'number' ? total.toFixed(2) : total}`
          ]);
        });
      }
      
      if (tableRows.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [tableHeaders],
          body: tableRows,
          theme: 'striped',
          headStyles: { fillColor: [0, 128, 128], textColor: 255 }, // Teal header like image
          styles: { fontSize: 9 },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 20 }, // QTY
            1: { cellWidth: 'auto' }, // Description
            2: { cellWidth: 40, halign: 'right' }, // Unit Price
            3: { cellWidth: 40, halign: 'right' } // Amount
          }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // Summary Section (Subtotal, Tax, Total)
      const currency = type === 'received' 
        ? (invoice as ReceivedInvoice)?.currency || '₦'
        : invoiceData?.document_currency_code || '₦';
      
      const subtotal = type === 'received'
        ? (invoice as ReceivedInvoice)?.amount || 0
        : invoiceData?.legal_monetary_total?.tax_exclusive_amount || invoiceData?.legal_monetary_total?.line_extension_amount || 0;
      
      const taxAmount = type === 'received'
        ? 0
        : (invoiceData?.legal_monetary_total?.tax_inclusive_amount || 0) - (invoiceData?.legal_monetary_total?.tax_exclusive_amount || 0);
      
      const totalAmount = type === 'received'
        ? (invoice as ReceivedInvoice)?.amount || 0
        : invoiceData?.legal_monetary_total?.payable_amount || 0;
      
      const summaryX = pageWidth - 60;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      doc.text('Subtotal', summaryX - 30, yPos);
      doc.text(`${currency} ${typeof subtotal === 'number' ? subtotal.toFixed(2) : subtotal}`, summaryX, yPos);
      yPos += 6;
      
      if (taxAmount > 0) {
        const taxRate = subtotal > 0 ? ((taxAmount / subtotal) * 100).toFixed(1) : '0';
        doc.text(`Sales Tax (${taxRate}%)`, summaryX - 30, yPos);
        doc.text(`${currency} ${typeof taxAmount === 'number' ? taxAmount.toFixed(2) : taxAmount}`, summaryX, yPos);
        yPos += 6;
      }
      
      // Total with teal background effect
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(0, 128, 128);
      doc.rect(summaryX - 50, yPos - 5, 50, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Total (USD)', summaryX - 45, yPos);
      doc.text(`${currency} ${typeof totalAmount === 'number' ? totalAmount.toFixed(2) : totalAmount}`, summaryX, yPos);
      
      yPos += 15;
      
      // Terms and Conditions
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 128, 128);
      doc.setFontSize(10);
      doc.text('Terms and Conditions', 20, yPos);
      
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      
      const paymentTerms = invoiceData?.payment_terms_note || `Payment is due in 14 days`;
      doc.text(paymentTerms, 20, yPos);
      yPos += 5;
      doc.text(`Please make checks payable to: ${companyName}`, 20, yPos);
      
      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Generated by eInvoice Pro System', 20, pageHeight - 10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, summaryX, pageHeight - 10);
      
      // Download
      const fileName = `invoice-${invoiceNumber}-${invoice?.irn || 'draft'}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('PDF download error:', err);
      setPdfError('Failed to generate PDF for download. Please try again.');
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="size-5 text-primary" />
            Invoice: {type === 'received' 
              ? (invoice as ReceivedInvoice)?.invoiceNumber || 'N/A'
              : (invoice as Invoice)?.invoice_number || invoice?.irn || 'Draft'}
          </DialogTitle>
          <DialogDescription>Review invoice data, generate PDF, or access QR code.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0 px-6 mt-4">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="preview" className="gap-2"><List className="size-4"/> Data Preview</TabsTrigger>
            <TabsTrigger value="pdf" className="gap-2"><FileText className="size-4"/> PDF Document</TabsTrigger>
            <TabsTrigger value="qr" className="gap-2"><QrCode className="size-4"/> QR Code</TabsTrigger>
          </TabsList>

          {/* DYNAMIC DATA PREVIEW TAB */}
          <TabsContent value="preview" className="flex-1 overflow-auto pb-6">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin size-8 text-primary" />
                <span className="ml-3 text-muted-foreground">Loading invoice details...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 bg-slate-50/50">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Supplier</p>
                    {type === 'received' ? (
                      <>
                        <p className="font-bold mt-1 text-sm break-words">{((invoice as ReceivedInvoice)?.recipientName || 'N/A')}</p>
                        <p className="text-xs break-all mt-1">TIN: {(invoice as ReceivedInvoice)?.recipientTin || 'N/A'}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold mt-1 text-sm break-words line-clamp-2">{(displayInvoice as any)?.accounting_supplier_party?.party_name || 'N/A'}</p>
                        <p className="text-xs break-all mt-1">{(displayInvoice as any)?.accounting_supplier_party?.email || ''}</p>
                        <p className="text-xs break-all mt-1">TIN: {(displayInvoice as any)?.accounting_supplier_party?.tin || 'N/A'}</p>
                        {(displayInvoice as any)?.accounting_supplier_party?.telephone && (
                          <p className="text-xs break-all mt-1">Tel: {(displayInvoice as any).accounting_supplier_party.telephone}</p>
                        )}
                      </>
                    )}
                  </Card>
                  <Card className="p-4 bg-slate-50/50">
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Customer</p>
                    {type === 'received' ? (
                      <>
                        <p className="font-bold mt-1 text-sm break-words">Your Business</p>
                        <p className="text-xs break-all mt-1">Invoice #{type === 'received' ? (invoice as ReceivedInvoice)?.invoiceNumber : (invoice as Invoice)?.invoice_number}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold mt-1 text-sm break-words line-clamp-2">{displayInvoice?.accounting_customer_party?.party_name || 'N/A'}</p>
                        <p className="text-xs break-all mt-1">{displayInvoice?.accounting_customer_party?.email || ''}</p>
                        <p className="text-xs break-all mt-1">TIN: {displayInvoice?.accounting_customer_party?.tin || 'N/A'}</p>
                        {displayInvoice?.accounting_customer_party?.telephone && (
                          <p className="text-xs break-all mt-1">Tel: {displayInvoice.accounting_customer_party.telephone}</p>
                        )}
                      </>
                    )}
                  </Card>
                  <Card className="p-4 bg-primary/5 border-primary/20">
                    <p className="text-xs font-semibold uppercase text-primary mb-2">Total Payable</p>
                    {type === 'received' ? (
                      <p className="text-2xl font-bold text-primary break-words">
                        {(invoice as ReceivedInvoice)?.currency || 'USD'} {(invoice as ReceivedInvoice)?.amount || '0.00'}
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-primary break-words">
                        {displayInvoice?.document_currency_code || 'USD'} {displayInvoice?.legal_monetary_total?.payable_amount || '0.00'}
                      </p>
                    )}
                  </Card>
                </div>

                {tableData.rows.length > 0 ? (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b">
                          <tr>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Item & Description</th>
                            {tableData.headers.map(h => (
                              <th key={h.key} className="px-4 py-3 text-right font-bold text-slate-700">{h.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.rows.map((line: any, i: number) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="font-semibold">{line.item?.name || line.description || 'N/A'}</div>
                                {line.item?.description && (
                                  <div className="text-xs text-muted-foreground">{line.item.description}</div>
                                )}
                              </td>
                              {tableData.headers.map(h => (
                                <td key={h.key} className="px-4 py-3 text-right whitespace-nowrap">
                                  {line[h.key]?.toString() || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No invoice items available to display.</p>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* PDF TAB */}
          <TabsContent value="pdf" className="flex-1 flex flex-col min-h-0 pb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}><ChevronLeft/></Button>
                <span className="text-xs">Page {pageNumber} / {numPages}</span>
                <Button variant="outline" size="sm" disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)}><ChevronRight/></Button>
              </div>
              <Button size="sm" onClick={handleDownloadPDF} disabled={!pdfUrl}><Download className="mr-2 size-4"/> Download PDF</Button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-200 rounded border p-4">
              {isLoadingPdf ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <Loader2 className="animate-spin size-8 text-primary" />
                </div>
              ) : pdfError ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-destructive">
                  <AlertCircle className="size-8 mb-2"/>
                  <p>{pdfError}</p>
                </div>
              ) : pdfUrl ? (
                <div className="flex justify-start min-w-fit">
                  <PDFViewer
                    file={pdfUrl}
                    pageNumber={pageNumber}
                    width={containerWidth}
                    onLoadSuccess={({numPages}) => setNumPages(numPages)}
                  />
                </div>
              ) : null}
            </div>
          </TabsContent>

          {/* QR TAB */}
          <TabsContent value="qr" className="flex-1 flex flex-col items-center justify-center pb-10">
            <div className="p-6 bg-white border-2 rounded-2xl shadow-sm">
              <QRCodeSVG value={invoice.irn || ''} size={240} level="H" includeMargin />
            </div>
            <p className="mt-4 font-mono text-sm font-bold">{invoice.irn}</p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="p-4 border-t bg-slate-50">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close Preview</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}