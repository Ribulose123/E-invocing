'use client'
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, FileText, X, Map } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/components/ui/utils';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

// Invoice data structure type based on invoice-data (1).json
type InvoiceData = {
  business_id: string;
  irn: string;
  issue_date: string;
  due_date: string;
  invoice_type_code: string;
  note: string;
  tax_point_date: string;
  document_currency_code: string;
  tax_currency_code: string;
  accounting_cost: string;
  buyer_reference: string;
  invoice_delivery_period: {
    start_date: string;
    end_date: string;
  };
  order_reference: string;
  billing_reference: Array<{
    irn: string;
    issue_date: string;
  }>;
  dispatch_document_reference: {
    irn: string;
    issue_date: string;
  };
  receipt_document_reference: {
    irn: string;
    issue_date: string;
  };
  originator_document_reference: {
    irn: string;
    issue_date: string;
  };
  contract_document_reference: {
    irn: string;
    issue_date: string;
  };
  additional_document_reference: Array<{
    irn: string;
    issue_date: string;
  }>;
  accounting_supplier_party: {
    party_name: string;
    tin: string;
    email: string;
    telephone: string;
    business_description: string;
    postal_address: {
      street_name: string;
      city_name: string;
      postal_zone: string;
      country: string;
    };
  };
  accounting_customer_party: {
    id: string;
    party_name: string;
    tin: string;
    email: string;
    telephone: string;
    business_description: string;
    postal_address: {
      street_name: string;
      city_name: string;
      postal_zone: string;
      country: string;
    };
  };
  actual_delivery_date: string;
  payment_means: Array<{
    payment_means_code: string;
    payment_due_date: string;
  }>;
  payment_terms_note: string;
  allowance_charge: Array<{
    charge_indicator: boolean;
    amount: number;
  }>;
  tax_total: Array<{
    tax_amount: number;
    tax_subtotal: Array<{
      taxable_amount: number;
      tax_amount: number;
      tax_category: {
        id: string;
        percent: number;
      };
    }>;
  }>;
  legal_monetary_total: {
    line_extension_amount: number;
    tax_exclusive_amount: number;
    tax_inclusive_amount: number;
    payable_amount: number;
  };
  invoice_line: Array<{
    hsn_code: string;
    product_category: string;
    dicount_rate: number;
    dicount_amount: number;
    fee_rate: number;
    fee_amount: number;
    invoiced_quantity: number;
    line_extension_amount: number;
    item: {
      name: string;
      description: string;
      sellers_item_identification: string;
    };
    price: {
      price_amount: number;
      base_quantity: number;
      price_unit: string;
    };
  }>;
};

// Invoice data structure template based on invoice-data (1).json
const invoiceDataTemplate: InvoiceData = {
  business_id: "",
  irn: "",
  issue_date: "",
  due_date: "",
  invoice_type_code: "",
  note: "",
  tax_point_date: "",
  document_currency_code: "NGN",
  tax_currency_code: "NGN",
  accounting_cost: "",
  buyer_reference: "",
  invoice_delivery_period: {
    start_date: "",
    end_date: ""
  },
  order_reference: "",
  billing_reference: [],
  dispatch_document_reference: {
    irn: "",
    issue_date: ""
  },
  receipt_document_reference: {
    irn: "",
    issue_date: ""
  },
  originator_document_reference: {
    irn: "",
    issue_date: ""
  },
  contract_document_reference: {
    irn: "",
    issue_date: ""
  },
  additional_document_reference: [],
  accounting_supplier_party: {
    party_name: "",
    tin: "",
    email: "",
    telephone: "",
    business_description: "",
    postal_address: {
      street_name: "",
      city_name: "",
      postal_zone: "",
      country: "NG"
    }
  },
  accounting_customer_party: {
    id: "",
    party_name: "",
    tin: "",
    email: "",
    telephone: "",
    business_description: "",
    postal_address: {
      street_name: "",
      city_name: "",
      postal_zone: "",
      country: "NG"
    }
  },
  actual_delivery_date: "",
  payment_means: [],
  payment_terms_note: "",
  allowance_charge: [],
  tax_total: [],
  legal_monetary_total: {
    line_extension_amount: 0,
    tax_exclusive_amount: 0,
    tax_inclusive_amount: 0,
    payable_amount: 0
  },
  invoice_line: []
};

export function UploadDialog({ open, onOpenChange, onUploadSuccess }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [header, setHeader] = useState<string[]>([]);
  const [mappedJson, setMappedJson] = useState<InvoiceData>(invoiceDataTemplate);
  const [jsonString, setJsonString] = useState<string>('');
  const [preview, setPreview] = useState(false);
  const [jsonError, setJsonError] = useState<string>('');


  const parseExcelFile = async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      
      const arrayBuffer = await file.arrayBuffer();
      
      const workBook = XLSX.read(arrayBuffer, { type: 'array' });

      // Get first sheet
      const firstSheetName = workBook.SheetNames[0];
      const workSheet = workBook.Sheets[firstSheetName];

      const jsonData = XLSX.utils.sheet_to_json(workSheet, {
        header: 1,
        defval: ''
      }) as string[][];

      // Extract ONLY the first row (headers)
      const headerRow = jsonData[0] || [];
      
      // Clean headers - remove empty values and trim whitespace
      const cleanedHeaders = headerRow
        .filter(header => header && header.toString().trim() !== '')
        .map(header => header.toString().trim());

      // Set headers state
      setHeader(cleanedHeaders);

      // Initialize mapped JSON with template
      const initialJson = JSON.parse(JSON.stringify(invoiceDataTemplate));
      setMappedJson(initialJson);
      setJsonString(JSON.stringify(initialJson, null, 2));
      setPreview(true);
      setErrorMessage('');
      setJsonError('');
      
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setErrorMessage('Error parsing Excel file. Please check the file format.');
      setPreview(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setUploadStatus('idle');
      setErrorMessage('');
      setPreview(false);
      
      // Automatically parse the file to extract headers
      await parseExcelFile(selectedFile);
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonString(value);
    try {
      const parsed = JSON.parse(value) as InvoiceData;
      setMappedJson(parsed);
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON format');
    }
  };

  const handleMapHeaders = () => {
    // This function can be extended to show a mapping dialog
    // For now, it will just log the headers for manual mapping
    console.log('Headers to map:', header);
    console.log('Current JSON structure:', mappedJson);
    // You can implement a mapping dialog here
    alert('Mapping feature: Headers are available for mapping. You can manually edit the JSON on the right to map Excel headers to invoice fields.');
  };

  const downloadMappedJson = () => {
    try {
      const jsonToDownload = jsonError ? mappedJson : JSON.parse(jsonString) as InvoiceData;
      const jsonStringToDownload = JSON.stringify(jsonToDownload, null, 2);
      const blob = new Blob([jsonStringToDownload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-mapping-${file?.name.replace(/\.[^/.]+$/, '') || 'data'}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setJsonError('Cannot download: Invalid JSON format');
    }
  };

  const resetPreview = () => {
    setFile(null);
    setHeader([]);
    setMappedJson(invoiceDataTemplate);
    setJsonString('');
    setPreview(false);
    setErrorMessage('');
    setJsonError('');
    setUploadStatus('idle');
    
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');
    
    try {
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('authToken');
      
      if (!userData || !token) {
        setUploadStatus('error');
        setErrorMessage('Please log in to upload invoices');
        return;
      }

      const user = JSON.parse(userData);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('business_id', user.id);
      // Extract invoice number from filename or generate one
      const invoiceNumber = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
      formData.append('invoice_number', invoiceNumber || `INV-${Date.now()}`);

      const { API_END_POINT } = await import('@/app/config/Api');
      const response = await fetch(API_END_POINT.INVOICE.CREAT_INVOICE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setUploadStatus('success');
        onUploadSuccess();
        
        // Close dialog after success
        setTimeout(() => {
          onOpenChange(false);
          setFile(null);
          setUploadStatus('idle');
          setErrorMessage('');
        }, 2000);
      } else {
        const errorData = await response.json();
        setUploadStatus('error');
        setErrorMessage(errorData.message || 'Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setErrorMessage('Network error. Please check your connection.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          preview 
            ? '!max-w-[95vw] sm:!max-w-[95vw] w-full' 
            : 'max-w-2xl sm:max-w-2xl',
          'max-h-[95vh] overflow-y-auto transition-all duration-300'
        )}
        style={preview ? { maxWidth: '95vw', width: '100%' } : undefined}
      >
        <DialogHeader>
          <DialogTitle>Upload Invoice Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file containing invoice data. The file will be processed and invoices will be transmitted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {uploadStatus === 'success' ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <CheckCircle2 className="size-16 text-green-600" />
              <p className="text-center text-green-600">
                Invoices uploaded successfully!
              </p>
            </div>
          ) : uploadStatus === 'error' ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <AlertCircle className="size-16 text-red-600" />
              <p className="text-center text-red-600">
                {errorMessage || 'Upload failed. Please try again.'}
              </p>
            </div>
          ) : (
            <>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <FileSpreadsheet className="size-12 text-slate-400" />
                  <span className="text-sm text-slate-600">
                    {file ? file.name : 'Click to select Excel file'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Supports .xlsx and .xls files
                  </span>
                </label>
              </div>

              {/* Headers Preview Section */}
              {preview && header.length > 0 && (
                <Card className="p-6 w-full">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Excel Headers ({header.length} columns) - Map to Invoice JSON
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetPreview}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <X className="size-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                    
                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                      {/* Left: Headers List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-semibold text-slate-700 uppercase">
                            Excel Headers
                          </h5>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMapHeaders}
                            className="text-xs"
                          >
                            <Map className="size-3 mr-1" />
                            Map Headers
                          </Button>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-[600px] overflow-y-auto w-full">
                          <ul className="space-y-1">
                            {header.map((headerName, index) => (
                              <li
                                key={index}
                                className="flex items-center gap-2 px-3 py-2 bg-white rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                              >
                                <span className="text-xs font-mono text-slate-500 w-6">
                                  {index + 1}
                                </span>
                                <span className="text-sm text-slate-900 flex-1">
                                  {headerName}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Right: Editable JSON */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-semibold text-slate-700 uppercase">
                            Invoice JSON Structure
                          </h5>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadMappedJson}
                            className="text-xs"
                          >
                            <FileText className="size-3 mr-1" />
                            Download
                          </Button>
                        </div>
                        <div className="relative w-full">
                          <textarea
                            value={jsonString}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            className="w-full h-[600px] p-3 font-mono text-xs bg-slate-900 text-green-400 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            spellCheck={false}
                            placeholder="Invoice JSON structure will appear here..."
                          />
                          {jsonError && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                              {jsonError}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Edit the JSON structure to map Excel headers or hardcode values. The structure follows the invoice data format.
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {!preview && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm text-blue-900 mb-2">Expected Excel Format:</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Invoice Number</li>
                    <li>• Recipient Name</li>
                    <li>• Recipient TIN</li>
                    <li>• Amount</li>
                    <li>• Date</li>
                    <li>• Due Date</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="flex-1"
                >
                  {uploading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="size-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

