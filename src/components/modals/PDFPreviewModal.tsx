'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// PDF Preview Modal Component
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import type { Invoice, ReceivedInvoice } from '@/app/type';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dynamic from 'next/dynamic';

// Dynamically import react-pdf components to avoid SSR issues with DOMMatrix
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

export function PDFPreviewModal({ open, onOpenChange, invoice, type }: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [fullInvoiceData, setFullInvoiceData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  // Removed tabs - only showing PDF now
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  // Always fetch full invoice details from API to ensure we have the latest data
  useEffect(() => {
    if (!open || !invoice || type !== 'sent') {
      // For received invoices, use the invoice data directly
      if (open && invoice && type === 'received') {
        setFullInvoiceData(invoice);
      }
      return;
    }

    // Always fetch fresh invoice details from API for sent invoices
    const fetchFullDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        if (!token || !userData) {
          // Fallback to invoice data if no token
          setFullInvoiceData(invoice);
          return;
        }

        const { API_END_POINT } = await import('@/app/config/Api');
        // GET_INVOICE_DETAILS only has {invoice_id} placeholder, not {business_id}
        const endpoint = API_END_POINT.INVOICE.GET_INVOICE_DETAILS
          .replace('{invoice_id}', invoice.id);

        const response = await fetch(endpoint, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const result = await response.json();
          // The API returns { data: { invoice_data: {...}, invoice_number, irn, ... } }
          setFullInvoiceData(result.data || result);
        } else {
          // If API fails, fallback to invoice data
          console.warn('Failed to fetch invoice details, using cached data');
          setFullInvoiceData(invoice);
        }
      } catch (error) {
        console.error('Failed to fetch invoice details:', error);
        // Fallback to invoice data on error
        setFullInvoiceData(invoice);
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
    
    // Prioritize fullInvoiceData (from API) over invoice (from list)
    const source = fullInvoiceData || invoice;
    const invoiceData = (source as any)?.invoice_data || source;
    
    // Merge top-level metadata with invoice_data for easier access
    // This ensures we have all the invoice details in one place
    return {
      ...invoiceData,
      // Top-level fields override invoice_data fields
      invoice_number: (source as any)?.invoice_number || invoiceData?.invoice_number,
      irn: (source as any)?.irn || invoiceData?.irn,
      platform: (source as any)?.platform || invoiceData?.platform,
      current_status: (source as any)?.current_status || invoiceData?.current_status,
      created_at: (source as any)?.created_at || invoiceData?.created_at,
      // Ensure we preserve all fields from the source
      ...(source as any),
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
      // Calculated width based on full viewport width minus padding
      const padding = 80; // px-6 on each side (24px * 2) + border + some margin
      const calculatedWidth = window.innerWidth - padding;
      setContainerWidth(Math.max(calculatedWidth, 400)); // Minimum width of 400px
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Helper function to convert QR code SVG to image data URL
  const qrCodeToImageData = useCallback(async (irn: string, size: number = 80): Promise<string | null> => {
    try {
      // Create a temporary hidden container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = `${size}px`;
      container.style.height = `${size}px`;
      document.body.appendChild(container);
      
      // Create canvas for QR code
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        document.body.removeChild(container);
        return null;
      }
      
      // Fill white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, size, size);
      
      // Render QR code SVG to container using dynamic imports
      const [ReactDOM, QRCodeModule] = await Promise.all([
        import('react-dom/client'),
        import('qrcode.react')
      ]);
      const { QRCodeSVG } = QRCodeModule;
      
      const qrDiv = document.createElement('div');
      container.appendChild(qrDiv);
      
      const root = ReactDOM.createRoot(qrDiv);
      root.render(React.createElement(QRCodeSVG, { 
        value: irn, 
        size: size, 
        level: 'H', 
        includeMargin: true 
      }));
      
      // Wait for QR code to render, then capture as image
      return new Promise<string | null>((resolve) => {
        setTimeout(() => {
          const svg = qrDiv.querySelector('svg');
          if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            
            img.onload = () => {
              ctx.clearRect(0, 0, size, size);
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, size, size);
              ctx.drawImage(img, 0, 0, size, size);
              const dataUrl = canvas.toDataURL('image/png');
              URL.revokeObjectURL(url);
              document.body.removeChild(container);
              resolve(dataUrl);
            };
            
            img.onerror = () => {
              URL.revokeObjectURL(url);
              document.body.removeChild(container);
              resolve(null);
            };
            
            img.src = url;
          } else {
            document.body.removeChild(container);
            resolve(null);
          }
        }, 200);
      });
    } catch (error) {
      console.error('Error converting QR code:', error);
      return null;
    }
  }, []);

  const generatePDF = useCallback(async () => {
    // Wait for full invoice data to be loaded before generating PDF
    if (!invoice || (!displayInvoice && type === 'sent')) {
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
      // Use fullInvoiceData if available, otherwise use displayInvoice
      const sourceData = fullInvoiceData || displayInvoice || invoice;
      const invoiceData = (sourceData as any)?.invoice_data || sourceData;
      
      // Get invoice details - prioritize fullInvoiceData, then displayInvoice, then invoice
      const invoiceNumber = type === 'received' 
        ? (invoice as ReceivedInvoice)?.invoiceNumber 
        : (fullInvoiceData as any)?.invoice_number || (sourceData as any)?.invoice_number || (invoice as Invoice)?.invoice_number || invoice?.irn || 'Draft';
      
      const invoiceDate = type === 'received' 
        ? (invoice as ReceivedInvoice)?.date 
        : invoiceData?.issue_date || (fullInvoiceData as any)?.created_at || (sourceData as any)?.created_at || new Date().toISOString().split('T')[0];
      
      const dueDate = invoiceData?.due_date || '';
      const invoiceIrn = (fullInvoiceData as any)?.irn || (sourceData as any)?.irn || invoice?.irn || '';
      
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
        ? (invoice as ReceivedInvoice)?.currency || 'NGN'
        : invoiceData?.document_currency_code || 'NGN';
      
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
      doc.text(`Total (${currency})`, summaryX - 45, yPos);
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
      
      // Add QR Code from API response (bottom right corner)
      // Check for qr_code in fullInvoiceData first, then fallback to generating locally
      const qrCodeBase64 = (fullInvoiceData as any)?.qr_code || (sourceData as any)?.qr_code;
      if (qrCodeBase64) {
        try {
          // Convert base64 string to data URL
          const qrImageData = `data:image/png;base64,${qrCodeBase64}`;
          const pageHeight = doc.internal.pageSize.height;
          const qrX = pageWidth - 70;
          const qrY = pageHeight - 80;
          doc.addImage(qrImageData, 'PNG', qrX, qrY, 50, 50);
          
          // Add IRN text below QR code
          if (invoiceIrn) {
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            doc.text('IRN:', qrX, qrY + 52);
            doc.setFontSize(6);
            const irnLines = doc.splitTextToSize(invoiceIrn, 50);
            doc.text(irnLines, qrX, qrY + 57);
          }
        } catch (qrError) {
          console.warn('Failed to add QR code from API to PDF:', qrError);
          // Fallback to generating QR code locally if API QR code fails
          if (invoiceIrn) {
            try {
              const qrImageData = await qrCodeToImageData(invoiceIrn, 80);
              if (qrImageData) {
                const pageHeight = doc.internal.pageSize.height;
                const qrX = pageWidth - 70;
                const qrY = pageHeight - 80;
                doc.addImage(qrImageData, 'PNG', qrX, qrY, 50, 50);
                
                doc.setFontSize(7);
                doc.setTextColor(0, 0, 0);
                doc.text('IRN:', qrX, qrY + 52);
                doc.setFontSize(6);
                const irnLines = doc.splitTextToSize(invoiceIrn, 50);
                doc.text(irnLines, qrX, qrY + 57);
              }
            } catch (fallbackError) {
              console.warn('Failed to generate QR code locally:', fallbackError);
            }
          }
        }
      } else if (invoiceIrn) {
        // Fallback: Generate QR code locally if API doesn't provide one
        try {
          const qrImageData = await qrCodeToImageData(invoiceIrn, 80);
          if (qrImageData) {
            const pageHeight = doc.internal.pageSize.height;
            const qrX = pageWidth - 70;
            const qrY = pageHeight - 80;
            doc.addImage(qrImageData, 'PNG', qrX, qrY, 50, 50);
            
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            doc.text('IRN:', qrX, qrY + 52);
            doc.setFontSize(6);
            const irnLines = doc.splitTextToSize(invoiceIrn, 50);
            doc.text(irnLines, qrX, qrY + 57);
          }
        } catch (qrError) {
          console.warn('Failed to add QR code to PDF:', qrError);
        }
      }
      
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

  // Generate PDF when modal opens and full invoice data is loaded
  useEffect(() => {
    if (open && invoice && !pdfUrl && !isLoadingPdf && !isLoadingDetails && (fullInvoiceData || type === 'received')) {
      generatePDF();
    }
  }, [open, invoice?.id, generatePDF, pdfUrl, isLoadingPdf, isLoadingDetails, fullInvoiceData, type]);

  const handleDownloadPDF = async () => {
    if (!invoice || (!displayInvoice && type === 'sent')) return;
    
    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : null;
      
      const doc = new jsPDF();
      // Use fullInvoiceData if available, otherwise use displayInvoice - same as preview
      const sourceData = fullInvoiceData || displayInvoice || invoice;
      const invoiceData = (sourceData as any)?.invoice_data || sourceData;
      
      // Get invoice details - use same logic as preview to ensure consistency
      const invoiceNumber = type === 'received' 
        ? (invoice as ReceivedInvoice)?.invoiceNumber 
        : (fullInvoiceData as any)?.invoice_number || (sourceData as any)?.invoice_number || (invoice as Invoice)?.invoice_number || invoice?.irn || 'Draft';
      
      const invoiceDate = type === 'received' 
        ? (invoice as ReceivedInvoice)?.date 
        : invoiceData?.issue_date || (fullInvoiceData as any)?.created_at || (sourceData as any)?.created_at || new Date().toISOString().split('T')[0];
      
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
        ? (invoice as ReceivedInvoice)?.currency || 'NGN'
        : invoiceData?.document_currency_code || 'NGN';
      
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
      doc.text(`Total (${currency})`, summaryX - 45, yPos);
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
      
      // Add QR Code from API response (bottom right corner)
      // Check for qr_code in fullInvoiceData first, then fallback to generating locally
      const qrCodeBase64 = (fullInvoiceData as any)?.qr_code || (sourceData as any)?.qr_code;
      const invoiceIrnForDownload = (fullInvoiceData as any)?.irn || (sourceData as any)?.irn || invoice?.irn || '';
      
      if (qrCodeBase64) {
        try {
          // Convert base64 string to data URL
          const qrImageData = `data:image/png;base64,${qrCodeBase64}`;
          const pageHeight = doc.internal.pageSize.height;
          const qrX = pageWidth - 70;
          const qrY = pageHeight - 80;
          doc.addImage(qrImageData, 'PNG', qrX, qrY, 50, 50);
          
          // Add IRN text below QR code
          if (invoiceIrnForDownload) {
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            doc.text('IRN:', qrX, qrY + 52);
            doc.setFontSize(6);
            const irnLines = doc.splitTextToSize(invoiceIrnForDownload, 50);
            doc.text(irnLines, qrX, qrY + 57);
          }
        } catch (qrError) {
          console.warn('Failed to add QR code from API to PDF:', qrError);
          // Fallback to generating QR code locally if API QR code fails
          if (invoiceIrnForDownload) {
            try {
              const qrImageData = await qrCodeToImageData(invoiceIrnForDownload, 80);
              if (qrImageData) {
                const pageHeight = doc.internal.pageSize.height;
                const qrX = pageWidth - 70;
                const qrY = pageHeight - 80;
                doc.addImage(qrImageData, 'PNG', qrX, qrY, 50, 50);
                
                doc.setFontSize(7);
                doc.setTextColor(0, 0, 0);
                doc.text('IRN:', qrX, qrY + 52);
                doc.setFontSize(6);
                const irnLines = doc.splitTextToSize(invoiceIrnForDownload, 50);
                doc.text(irnLines, qrX, qrY + 57);
              }
            } catch (fallbackError) {
              console.warn('Failed to generate QR code locally:', fallbackError);
            }
          }
        }
      } else if (invoiceIrnForDownload) {
        // Fallback: Generate QR code locally if API doesn't provide one
        try {
          const qrImageData = await qrCodeToImageData(invoiceIrnForDownload, 80);
          if (qrImageData) {
            const pageHeight = doc.internal.pageSize.height;
            const qrX = pageWidth - 70;
            const qrY = pageHeight - 80;
            doc.addImage(qrImageData, 'PNG', qrX, qrY, 50, 50);
            
            doc.setFontSize(7);
            doc.setTextColor(0, 0, 0);
            doc.text('IRN:', qrX, qrY + 52);
            doc.setFontSize(6);
            const irnLines = doc.splitTextToSize(invoiceIrnForDownload, 50);
            doc.text(irnLines, qrX, qrY + 57);
          }
        } catch (qrError) {
          console.warn('Failed to add QR code to PDF:', qrError);
        }
      }
      
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
      <DialogContent 
        className="!max-w-[100vw] !w-[100vw] !sm:max-w-[100vw] h-[95vh] flex flex-col p-0 overflow-hidden !m-0"
        style={{ maxWidth: '100vw', width: '100vw', margin: 0 }}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="size-5 text-primary" />
            Invoice: {type === 'received' 
              ? (invoice as ReceivedInvoice)?.invoiceNumber || 'N/A'
              : (invoice as Invoice)?.invoice_number || invoice?.irn || 'Draft'}
          </DialogTitle>
          <DialogDescription>Preview and download your invoice PDF</DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 px-6 mt-4">
          {/* PDF VIEW ONLY */}
          <div className="flex-1 flex flex-col min-h-0 pb-4">
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
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-slate-50">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close Preview</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}