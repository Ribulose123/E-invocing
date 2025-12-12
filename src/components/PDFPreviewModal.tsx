'use client'
import { useState, useEffect, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, QrCode, FileText, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Invoice, ReceivedInvoice } from '@/app/type';

interface PDFPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | ReceivedInvoice | null;
  type: 'sent' | 'received';
}

export function PDFPreviewModal({ 
  open, 
  onOpenChange, 
  invoice, 
  type 
}: PDFPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pdf' | 'qr'>('pdf');
  const [qrSize, setQrSize] = useState(180);

  const isReceivedInvoice = (invoice: Invoice | ReceivedInvoice | null): invoice is ReceivedInvoice => {
    return type === 'received' && invoice !== null && 'invoiceNumber' in invoice;
  };

  // Generate QR code data
  const getQRCodeData = () => {
    if (!invoice) return '';
    
    if (isReceivedInvoice(invoice)) {
      // For received invoices: IRN + Invoice Number
      return JSON.stringify({
        irn: invoice.irn,
        invoiceNumber: invoice.invoiceNumber,
        type: 'received'
      });
    } else {
      // For sent invoices: IRN + Invoice Number
      return JSON.stringify({
        irn: invoice.irn,
        invoice_number: invoice.invoice_number,
        type: 'sent'
      });
    }
  };

  // Get invoice number for display
  const getInvoiceNumber = () => {
    if (!invoice) return '';
    return isReceivedInvoice(invoice) ? invoice.invoiceNumber : invoice.invoice_number;
  };

  // Get IRN for display
  const getIRN = () => {
    if (!invoice) return '';
    return invoice.irn || 'N/A';
  };

  // Generate a mock PDF (placeholder)
  const generateMockPDF = useCallback(() => {
    if (!invoice) return;
    
    // Create a simple HTML-based PDF representation
    // In production, use jsPDF or similar library
    const isReceived = type === 'received' && 'invoiceNumber' in invoice;
    const invoiceNumber = isReceived ? (invoice as ReceivedInvoice).invoiceNumber : (invoice as Invoice).invoice_number;
    const irn = invoice.irn || 'N/A';
    const status = isReceived ? (invoice as ReceivedInvoice).status : (invoice as Invoice).status_text;
    
    // For now, create a data URL with invoice info
    // This is a placeholder - replace with actual PDF generation
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #8B1538; }
            .info { margin: 20px 0; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Invoice ${invoiceNumber}</h1>
          <div class="info">
            <div><span class="label">IRN:</span> ${irn}</div>
            <div><span class="label">Invoice Number:</span> ${invoiceNumber}</div>
            <div><span class="label">Status:</span> ${status}</div>
          </div>
          <p>This is a preview. Full PDF generation will be implemented with backend support.</p>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    setIsLoadingPdf(false);
  }, [invoice, type]);

  // Set QR code size based on screen width
  useEffect(() => {
    const updateQrSize = () => {
      setQrSize(window.innerWidth < 640 ? 150 : 180);
    };
    
    updateQrSize();
    window.addEventListener('resize', updateQrSize);
    return () => window.removeEventListener('resize', updateQrSize);
  }, []);

  // Fetch or generate PDF
  useEffect(() => {
    if (open && invoice) {
      setIsLoadingPdf(true);
      setPdfError(null);
      
      // TODO: Replace with actual API endpoint when available
      // For now, we'll create a mock PDF or fetch from API if endpoint exists
      const fetchPDF = async () => {
        try {
          const userData = localStorage.getItem('userData');
          const token = localStorage.getItem('authToken');
          
          if (!userData || !token) {
            throw new Error('Not authenticated');
          }

          const user = JSON.parse(userData);
          const invoiceId = invoice.id;
          
          // Try to fetch PDF from backend
          // If endpoint doesn't exist, we'll generate a simple PDF on frontend
          try {
            const { API_END_POINT } = await import('@/app/config/Api');
            const pdfEndpoint = `${API_END_POINT.INVOICE.GET_INVOICE_DETAILS.replace('{business_id}', user.id).replace('{invoice_id}', invoiceId)}/pdf`;
            
            const response = await fetch(pdfEndpoint, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              setPdfUrl(url);
              setIsLoadingPdf(false);
              return;
            } else {
              // If response is not ok (404, 500, etc.), fall back to mock PDF
              // Silently handle 404 as it's expected when endpoint doesn't exist yet
              if (response.status !== 404) {
                console.log(`PDF endpoint returned ${response.status}, generating mock PDF`);
              }
              generateMockPDF();
              return;
            }
          } catch (error) {
            // API endpoint doesn't exist yet or network error, generate mock PDF
            // Only log non-network errors (404s are expected and handled silently)
            if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
              // Network error - silently fall back to mock PDF
              generateMockPDF();
              return;
            }
            console.log('PDF endpoint not available, generating mock PDF');
            generateMockPDF();
            return;
          }

          // Generate a simple PDF on frontend as fallback
          // This is a placeholder - in production, you'd use jsPDF or similar
          generateMockPDF();
        } catch (error) {
          console.error('Error fetching PDF:', error);
          setPdfError('Failed to load PDF. Please try again.');
          setIsLoadingPdf(false);
        }
      };

      fetchPDF();
    } else {
      // Clean up PDF URL when modal closes
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
    }

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [open, invoice, generateMockPDF, pdfUrl]);

  const handleDownloadPDF = () => {
    if (!pdfUrl || !invoice) return;
    
    const invoiceNumber = getInvoiceNumber();
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `invoice-${invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadQR = () => {
    if (!invoice) return;
    
    const invoiceNumber = getInvoiceNumber();
    const qrElement = document.getElementById('qr-code-canvas');
    
    if (qrElement) {
      const svg = qrElement.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
              if (blob) {
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = `invoice-${invoiceNumber}-qr.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(downloadUrl);
              }
            }, 'image/png');
          }
          // Clean up the blob URL after image loads
          URL.revokeObjectURL(img.src);
        };
        
        img.onerror = () => {
          console.error('Failed to load SVG image');
        };
        
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.src = url;
      }
    }
  };

  if (!invoice) return null;

  const invoiceNumber = getInvoiceNumber();
  const irn = getIRN();
  const qrData = getQRCodeData();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col p-0 gap-0 m-2 sm:m-4">
        <DialogHeader className="flex-shrink-0 px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
          <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <FileText className="size-4 sm:size-5" />
            <span className="truncate">Invoice Preview - {invoiceNumber}</span>
          </DialogTitle>
          <DialogDescription className="mt-1.5 sm:mt-2 text-xs sm:text-sm">
            Preview and download the invoice PDF or QR code. Switch between tabs to view different options.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pdf' | 'qr')} className="w-full flex flex-col flex-1 min-h-0 px-3 sm:px-6">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0 mb-3 sm:mb-4 h-9 sm:h-10">
            <TabsTrigger value="pdf" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <FileText className="size-3 sm:size-4" />
              <span className="hidden xs:inline">PDF Preview</span>
              <span className="xs:hidden">PDF</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <QrCode className="size-3 sm:size-4" />
              <span className="hidden xs:inline">QR Code</span>
              <span className="xs:hidden">QR</span>
            </TabsTrigger>
          </TabsList>

          {/* PDF Preview Tab */}
          <TabsContent value="pdf" className="flex-1 min-h-0 flex flex-col mt-0">
            <Card className="p-2 sm:p-4 flex flex-col flex-1 min-h-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0 flex-shrink-0">
                <h3 className="text-base sm:text-lg font-semibold">PDF Preview</h3>
                {pdfUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    className="gap-1.5 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm"
                  >
                    <Download className="size-3 sm:size-4" />
                    <span className="hidden sm:inline">Download PDF</span>
                    <span className="sm:hidden">Download</span>
                  </Button>
                )}
              </div>
              
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex-1 min-h-[300px] sm:min-h-[400px] flex items-center justify-center">
                {isLoadingPdf ? (
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <div className="text-center">
                      <Loader2 className="size-6 sm:size-8 animate-spin mx-auto text-slate-400 mb-2" />
                      <p className="text-xs sm:text-sm text-slate-500">Loading PDF...</p>
                    </div>
                  </div>
                ) : pdfError ? (
                  <div className="flex items-center justify-center py-8 sm:py-12 px-4">
                    <div className="text-center">
                      <p className="text-red-600 mb-2 text-xs sm:text-sm">{pdfError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsLoadingPdf(true);
                          setPdfError(null);
                          generateMockPDF();
                        }}
                        className="text-xs sm:text-sm"
                      >
                        Generate Preview
                      </Button>
                    </div>
                  </div>
                ) : pdfUrl ? (
                  <iframe
                    src={pdfUrl}
                    className="w-full h-full min-h-[300px] sm:min-h-[400px] border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <p className="text-slate-500 text-xs sm:text-sm">No PDF available</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="flex-1 min-h-0 flex flex-col mt-0">
            <Card className="p-2 sm:p-4 flex flex-col flex-1 min-h-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0 flex-shrink-0">
                <h3 className="text-base sm:text-lg font-semibold flex items-center gap-1.5 sm:gap-2">
                  <QrCode className="size-4 sm:size-5" />
                  QR Code
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadQR}
                  className="gap-1.5 sm:gap-2 w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Download className="size-3 sm:size-4" />
                  <span className="hidden sm:inline">Download QR</span>
                  <span className="sm:hidden">Download</span>
                </Button>
              </div>
              
              <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 flex-1 min-h-0 py-2 sm:py-4">
                <div
                  id="qr-code-canvas"
                  className="p-2 sm:p-4 bg-white rounded-lg border-2 border-slate-200 flex-shrink-0"
                >
                  <QRCodeSVG
                    value={qrData}
                    size={qrSize}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                
                <div className="text-center space-y-1 sm:space-y-1.5 flex-shrink-0 px-2">
                  <p className="text-xs sm:text-sm font-medium text-slate-700 break-words">
                    Invoice Number: <span className="text-slate-900 font-semibold break-all">{invoiceNumber}</span>
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-slate-700 break-words">
                    IRN: <span className="text-slate-900 font-semibold break-all">{irn}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 sm:mt-2 px-2">
                    Scan this QR code to verify invoice details
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 px-3 sm:px-6 pb-4 sm:pb-6 pt-3 sm:pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

