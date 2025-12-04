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
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Map } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/components/ui/utils';
import { FieldMappingDialog, type FieldMapping } from '@/components/FieldMappingDialog';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

const MAPPING_STORAGE_KEY = 'invoiceFieldMappings';

export function UploadDialog({ open, onOpenChange, onUploadSuccess }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [header, setHeader] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  const getSavedMappings = (): FieldMapping => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(MAPPING_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const saveMappings = (mappings: FieldMapping) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(MAPPING_STORAGE_KEY, JSON.stringify(mappings));
    } catch (error) {
      console.error('Failed to save mappings to localStorage:', error);
    }
  };


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
      
      // Automatically parse the file to extract headers
      await parseExcelFile(selectedFile);
    }
  };

  const handleMapHeaders = () => {
    // Show the mapping dialog
    setShowMappingDialog(true);
  };

  const handleSaveMappings = (newMappings: FieldMapping) => {
    // Merge with existing mappings
    const existingMappings = getSavedMappings();
    const mergedMappings = { ...existingMappings, ...newMappings };
    saveMappings(mergedMappings);
    
    // Close mapping dialog
    setShowMappingDialog(false);
  };

  const resetPreview = () => {
    setFile(null);
    setHeader([]);
    setPreview(false);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className={cn(
            preview 
              ? 'max-w-3xl sm:max-w-3xl' 
              : 'max-w-2xl sm:max-w-2xl',
            'max-h-[95vh] overflow-y-auto transition-all duration-300'
          )}
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
                        Excel Headers ({header.length} columns)
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMapHeaders}
                          className="text-xs"
                        >
                          <Map className="size-3 mr-1" />
                          Map Headers
                        </Button>
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
                    </div>
                    
                    {/* Headers List */}
                    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-[500px] overflow-y-auto w-full">
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
                    <p className="text-xs text-slate-500">
                      Click &quot;Map Headers&quot; to map these Excel headers to invoice data structure fields.
                    </p>
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

    <FieldMappingDialog
      open={showMappingDialog}
      onOpenChange={setShowMappingDialog}
      userHeaders={header}
      existingMappings={getSavedMappings()}
      onSave={handleSaveMappings}
    />
    </>
  );
}

