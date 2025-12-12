'use client'
import { useState, useEffect } from 'react';
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
const FILE_STATE_STORAGE_KEY = 'invoiceUploadFileState';

interface SavedFileState {
  fileName: string;
  headers: string[];
  fileSize: number;
  lastModified: number;
}

export function UploadDialog({ open, onOpenChange, onUploadSuccess }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [header, setHeader] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [isRestoredState, setIsRestoredState] = useState(false);

  // Restore saved file state when dialog opens
  useEffect(() => {
    if (open && !file) {
      const savedState = getSavedFileState();
      if (savedState && savedState.headers.length > 0) {
        // Restore headers and preview state
        setHeader(savedState.headers);
        setPreview(true);
        setIsRestoredState(true);
        // Note: We can't restore the actual File object, but we can restore the headers
        // The user will need to re-select the file if they want to upload, but mappings are preserved
      } else {
        setIsRestoredState(false);
      }
    }
  }, [open, file]);

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

  const getSavedFileState = (): SavedFileState | null => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(FILE_STATE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const saveFileState = (fileName: string, headers: string[], fileSize: number, lastModified: number) => {
    if (typeof window === 'undefined') return;
    try {
      const state: SavedFileState = {
        fileName,
        headers,
        fileSize,
        lastModified,
      };
      localStorage.setItem(FILE_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save file state to localStorage:', error);
    }
  };

  const clearFileState = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(FILE_STATE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear file state from localStorage:', error);
    }
  };


  const parseExcelFile = async (file: File, isNewFile: boolean = true) => {
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
      setIsRestoredState(false); // New file, not restored

      // Save file state for persistence (only if it's a new file)
      if (isNewFile) {
        saveFileState(file.name, cleanedHeaders, file.size, file.lastModified);
      }
      
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      setErrorMessage('Error parsing Excel file. Please check the file format.');
      setPreview(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const savedState = getSavedFileState();
      
      // Check if this is a different file than the saved one
      const isNewFile = !savedState || 
        savedState.fileName !== selectedFile.name ||
        savedState.fileSize !== selectedFile.size ||
        savedState.lastModified !== selectedFile.lastModified;

      // If it's a new file, clear previous mappings
      if (isNewFile) {
        clearFileState();
        // Optionally clear mappings if you want fresh start for new files
        // Or keep mappings if they should persist across files
      }

      setFile(selectedFile);
      setUploadStatus('idle');
      setErrorMessage('');
      setPreview(false);
      
      // Automatically parse the file to extract headers
      await parseExcelFile(selectedFile, isNewFile);
    }
  };

  const handleMapHeaders = () => {
    // Show the mapping dialog
    setShowMappingDialog(true);
  };

  const handleSaveMappings = (newMappings: FieldMapping, closeDialog: boolean = true) => {
    // Merge with existing mappings
    const existingMappings = getSavedMappings();
    const mergedMappings = { ...existingMappings, ...newMappings };
    saveMappings(mergedMappings);
    
    // Close mapping dialog only if explicitly requested (e.g., when user clicks Save button)
    if (closeDialog) {
      setShowMappingDialog(false);
    }
  };

  // Auto-save mappings when mapping dialog closes (even without explicit save)
  const handleMappingDialogClose = (open: boolean) => {
    setShowMappingDialog(open);
    // If dialog is closing, ensure any unsaved mappings are preserved
    if (!open && header.length > 0) {
      // Mappings are auto-saved via handleSaveMappings with closeDialog=false
      // This ensures progress isn't lost if user closes without clicking save
    }
  };

  const resetPreview = () => {
    setFile(null);
    setHeader([]);
    setPreview(false);
    setErrorMessage('');
    setUploadStatus('idle');
    setIsRestoredState(false);
    
    // Clear saved file state when user explicitly removes the file
    clearFileState();
    
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
        // Note: We keep the file state saved so user can continue mapping if needed
        setTimeout(() => {
          onOpenChange(false);
          setFile(null);
          setUploadStatus('idle');
          setErrorMessage('');
          // Optionally clear file state on successful upload if you want fresh start next time
          // clearFileState();
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
              ? 'max-w-full sm:max-w-3xl' 
              : 'max-w-full sm:max-w-2xl',
            'max-h-[95vh] overflow-y-auto transition-all duration-300 m-2 sm:m-4'
          )}
        >
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Upload Invoice Excel</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
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
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-8 text-center hover:border-blue-400 transition-colors">
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
                  <FileSpreadsheet className="size-8 sm:size-12 text-slate-400" />
                  <span className="text-xs sm:text-sm text-slate-600 break-words max-w-full px-2">
                    {file ? file.name : 'Click to select Excel file'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Supports .xlsx and .xls files
                  </span>
                </label>
              </div>

              {/* Headers Preview Section */}
              {preview && header.length > 0 && (
                <Card className="p-3 sm:p-6 w-full">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900">
                          Excel Headers ({header.length} columns)
                        </h4>
                        {isRestoredState && (
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <CheckCircle2 className="size-3 flex-shrink-0" />
                            <span className="break-words">Continuing from previous session - your mappings are preserved</span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleMapHeaders}
                          className="text-xs flex-1 sm:flex-initial"
                        >
                          <Map className="size-3 sm:mr-1" />
                          <span className="hidden sm:inline">Map Headers</span>
                          <span className="sm:hidden">Map</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetPreview}
                          className="text-slate-600 hover:text-slate-900 text-xs"
                        >
                          <X className="size-3 sm:size-4 sm:mr-1" />
                          <span className="hidden sm:inline">Remove</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* Headers List */}
                    <div className="border border-slate-200 rounded-lg p-2 sm:p-3 bg-slate-50 max-h-[300px] sm:max-h-[500px] overflow-y-auto w-full">
                      <ul className="space-y-1">
                        {header.map((headerName, index) => (
                          <li
                            key={index}
                            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-white rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                          >
                            <span className="text-xs font-mono text-slate-500 w-5 sm:w-6 flex-shrink-0">
                              {index + 1}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-900 flex-1 break-words">
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

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:flex-1 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="w-full sm:flex-1 text-xs sm:text-sm"
                >
                  {uploading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Upload className="size-3 sm:size-4 sm:mr-2" />
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
      onOpenChange={handleMappingDialogClose}
      userHeaders={header}
      existingMappings={getSavedMappings()}
      onSave={(mappings) => handleSaveMappings(mappings, true)}
      onAutoSave={(mappings) => handleSaveMappings(mappings, false)}
    />
    </>
  );
}

