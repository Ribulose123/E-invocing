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
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

export function UploadDialog({ open, onOpenChange, onUploadSuccess }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [header, setHeader] = useState<string[]>([]);
  const [headerJson, setHeaderJson] = useState<object>({});
  const [preview, setPreview] = useState(false);
  const [showJsonView, setShowJsonView] = useState(false);


  const parseExcelFile = async (file: File) => {
    try {
      const XLSX = await import('xlsx');
      
      const arrayBuffer = await file.arrayBuffer();
      
      const workBook = XLSX.read(arrayBuffer, { type: 'array' });

      // Step 4: Get first sheet
      const firstSheetName = workBook.SheetNames[0];
      const workSheet = workBook.Sheets[firstSheetName];

      const jsonData = XLSX.utils.sheet_to_json(workSheet, {
        header: 1,
        defval: ''
      }) as string[][];

      // Step 6: Extract ONLY the first row (headers)
      // jsonData[0] contains the headers
      const headerRow = jsonData[0] || [];
      
      // Step 7: Clean headers - remove empty values and trim whitespace
      const cleanedHeaders = headerRow
        .filter(header => header && header.toString().trim() !== '')
        .map(header => header.toString().trim());

      // Step 8: Set headers state
      setHeader(cleanedHeaders);

      // Step 9: Create JSON object with headers only
      const jsonObject = {
        headers: cleanedHeaders,
        count: cleanedHeaders.length,
        fileName: file.name
      };
      setHeaderJson(jsonObject);
      setPreview(true);
      setErrorMessage('');
      
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
      setShowJsonView(false);
      
      // Automatically parse the file to extract headers
      await parseExcelFile(selectedFile);
    }
  };

  const downloadHeadersJson = () => {
    const jsonString = JSON.stringify(headerJson, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `excel-headers-${file?.name.replace(/\.[^/.]+$/, '') || 'data'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetPreview = () => {
    setFile(null);
    setHeader([]);
    setHeaderJson({});
    setPreview(false);
    setShowJsonView(false);
    setErrorMessage('');
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                <Card className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Excel Headers ({header.length} columns)
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
                    
                    {/* Headers Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 border border-slate-300">
                              Column Index
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-700 border border-slate-300">
                              Header Name
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {header.map((headerName, index) => (
                            <tr key={index} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-slate-600 border border-slate-300">
                                {index + 1}
                              </td>
                              <td className="px-4 py-2 text-sm text-slate-900 border border-slate-300 font-medium">
                                {headerName}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* JSON View Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowJsonView(!showJsonView)}
                        className="flex-1"
                      >
                        <FileText className="size-4 mr-2" />
                        {showJsonView ? 'Hide' : 'View'} JSON
                      </Button>
                      <Button
                        variant="outline"
                        onClick={downloadHeadersJson}
                        className="flex-1"
                      >
                        <FileText className="size-4 mr-2" />
                        Download JSON
                      </Button>
                    </div>
                    
                    {/* JSON Display */}
                    {showJsonView && (
                      <div className="bg-slate-900 rounded-lg p-4 overflow-auto max-h-64">
                        <pre className="text-green-400 text-xs">
                          {JSON.stringify(headerJson, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              )}

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

