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
  const [periodNum, setPeriodNum] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [header, setHeader] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [isRestoredState, setIsRestoredState] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Reset all state when dialog closes
      setFile(null);
      setPeriodNum('');
      setHeader([]);
      setPreview(false);
      setUploadStatus('idle');
      setErrorMessage('');
        setIsRestoredState(false);
      // Clear saved file state when dialog closes
      clearFileState();
    }
  }, [open]);

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
      // Silently handle error
    }
  };

  const clearMappings = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(MAPPING_STORAGE_KEY);
    } catch (error) {
      // Silently handle error
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
      // Silently handle error
    }
  };

  const clearFileState = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(FILE_STATE_STORAGE_KEY);
    } catch (error) {
      // Silently handle error
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

      // If it's a new file, clear previous state and mappings to start fresh
      if (isNewFile) {
        clearFileState();
        clearMappings();
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
    }
  };

  const resetPreview = () => {
    setFile(null);
    setHeader([]);
    setPreview(false);
    setErrorMessage('');
    setUploadStatus('idle');
    setIsRestoredState(false);
    
    // Clear saved file state and mappings when user explicitly removes the file
    clearFileState();
    clearMappings();
    
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
        setUploading(false);
        return;
      }

      // Validate periodNum format (YYYYMM)
      const trimmedPeriodNum = periodNum.trim();
      if (!trimmedPeriodNum) {
        setUploadStatus('error');
        setErrorMessage('Period Number is required. Please enter a period number in YYYYMM format (e.g., 202512).');
        setUploading(false);
        return;
      }

      // Validate periodNum format: should be 6 digits, YYYYMM
      const periodNumRegex = /^\d{6}$/;
      if (!periodNumRegex.test(trimmedPeriodNum)) {
        setUploadStatus('error');
        setErrorMessage('Invalid Period Number format. Please enter a period number in YYYYMM format (e.g., 202512 for December 2025).');
        setUploading(false);
        return;
      }

      // Validate month is between 01-12
      const month = parseInt(trimmedPeriodNum.slice(4, 6));
      if (month < 1 || month > 12) {
        setUploadStatus('error');
        setErrorMessage('Invalid Period Number. Month must be between 01 and 12.');
        setUploading(false);
        return;
      }

      // Check if invoice_number is mapped (required field)
      const mappings = getSavedMappings();
      const { INVOICE_FIELDS } = await import('./utils/fieldMappingUtils');
      const invoiceNumberField = INVOICE_FIELDS.find(f => f.value === 'invoice_number');
      
      // Check if invoice_number is mapped
      const isInvoiceNumberMapped = Object.values(mappings).includes('invoice_number');
      
      if (!isInvoiceNumberMapped && invoiceNumberField?.required) {
        setUploadStatus('error');
        setErrorMessage('Invoice Number is required. Please map the "Invoice Number" field using the "Map Headers" button before uploading.');
        setUploading(false);
        return;
      }

      const user = JSON.parse(userData);
      
      // Parse Excel file and convert to JSON
      let invoiceJson: any = {};
      let invoiceNumber = '';
      
      try {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workBook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workBook.SheetNames[0];
        const workSheet = workBook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(workSheet, { header: 1, defval: '' }) as string[][];
        
        // Get headers from first row
        const headerRow = jsonData[0] || [];
        
        // Check if there are data rows
        if (jsonData.length <= 1) {
          setUploadStatus('error');
          setErrorMessage('Your Excel file has no data rows. Please add invoice data rows below the header row.');
          setUploading(false);
          return;
        }
        
        // Helper function to set nested property in JSON object
        const setNestedProperty = (obj: any, path: string, value: any) => {
          const parts = path.split('.');
          let current = obj;
          for (let i = 0; i < parts.length - 1; i++) {
            let part = parts[i];
            // Handle array notation like invoice_line[]
            if (part.endsWith('[]')) {
              const arrayName = part.slice(0, -2);
              if (!current[arrayName]) {
                current[arrayName] = [];
              }
              if (current[arrayName].length === 0) {
                current[arrayName].push({});
              }
              current = current[arrayName][0];
            } else {
              if (!current[part]) {
                current[part] = {};
              }
              current = current[part];
            }
          }
          const lastPart = parts[parts.length - 1];
          current[lastPart] = value;
        };
        
        // Initialize invoice JSON with business_id
        invoiceJson.business_id = user.id;
        
        // Helper function to format dates to ISO format (YYYY-MM-DD)
        const formatDate = (dateValue: any): string | any => {
          if (!dateValue) return dateValue;
          
          // If it's already a Date object
          if (dateValue instanceof Date) {
            return dateValue.toISOString().split('T')[0];
          }
          
          // If it's a string, try to parse it
          if (typeof dateValue === 'string') {
            const trimmed = dateValue.trim();
            if (!trimmed) return dateValue;
            
            // Try to parse common date formats
            // Format: M/D/YYYY or MM/DD/YYYY
            const dateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (dateMatch) {
              const [, month, day, year] = dateMatch;
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            }
            
            // Try parsing as ISO date or other formats
            const parsedDate = new Date(trimmed);
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate.toISOString().split('T')[0];
            }
          }
          
          // If it's a number (Excel serial date), convert it
          if (typeof dateValue === 'number') {
            // Excel serial date: days since January 1, 1900
            const excelEpoch = new Date(1900, 0, 1);
            const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0];
            }
          }
          
          return dateValue;
        };
        
        // Process first data row (row index 1, since 0 is headers)
        const firstDataRow = jsonData[1];
        
        // List of date fields that need formatting
        const dateFields = ['issue_date', 'due_date', 'tax_point_date', 'actual_delivery_date', 
                           'invoice_delivery_period.start_date', 'invoice_delivery_period.end_date'];
        
        // Process each mapped field
        for (const [excelHeader, mappedField] of Object.entries(mappings)) {
          // Find column index for this Excel header
          const columnIndex = headerRow.findIndex(h => 
            String(h || '').trim().toLowerCase() === excelHeader.toLowerCase().trim()
          );
          
          if (columnIndex >= 0 && firstDataRow[columnIndex] !== undefined && firstDataRow[columnIndex] !== '') {
            let value: any = firstDataRow[columnIndex];
            
            // Convert value based on type
            if (typeof value === 'string') {
              value = value.trim();
              
              // Format dates to ISO format (YYYY-MM-DD)
              const isDateField = dateFields.some(df => mappedField.includes(df.split('.')[0]) || mappedField === df);
              if (isDateField) {
                value = formatDate(value);
              } else {
                // Try to convert numbers (but not dates)
                if (value && !isNaN(Number(value)) && value !== '' && value !== '0') {
                  const numValue = Number(value);
                  if (!isNaN(numValue)) {
                    value = numValue;
                  }
                }
              }
            } else if (typeof value === 'number') {
              // Check if this is a date field that might be stored as Excel serial number
              const isDateField = dateFields.some(df => mappedField.includes(df.split('.')[0]) || mappedField === df);
              if (isDateField) {
                value = formatDate(value);
              }
            }
            
            // Skip placeholder values
            const invalidPlaceholders = ['string', 'null', 'undefined', 'none', 'n/a', 'na', 'tbd', 'pending'];
            if (typeof value === 'string' && invalidPlaceholders.includes(value.toLowerCase())) {
              continue;
            }
            
            // Set the value in the JSON structure
            if (mappedField.includes('[]')) {
              // Array field like invoice_line[].item.name
              const arrayMatch = mappedField.match(/^([^[]+)\[\]\.?(.*)$/);
              if (arrayMatch) {
                const arrayName = arrayMatch[1];
                const fieldPath = arrayMatch[2] || '';
                if (!invoiceJson[arrayName]) {
                  invoiceJson[arrayName] = [];
                }
                if (invoiceJson[arrayName].length === 0) {
                  invoiceJson[arrayName].push({});
                }
                if (fieldPath) {
                  setNestedProperty(invoiceJson[arrayName][0], fieldPath, value);
                } else {
                  invoiceJson[arrayName][0] = value;
                }
              }
            } else if (mappedField.includes('.')) {
              // Nested field like accounting_supplier_party.party_name
              setNestedProperty(invoiceJson, mappedField, value);
            } else {
              // Simple field
              invoiceJson[mappedField] = value;
            }
            
            // Track invoice_number for validation
            if (mappedField === 'invoice_number') {
              invoiceNumber = String(value).trim();
            }
          }
        }
        
      } catch (error) {
        setUploadStatus('error');
        setErrorMessage('Error parsing Excel file. Please check the file format.');
        setUploading(false);
        return;
      }
      
      // Validate invoice_number is present
      const invalidPlaceholders = ['string', 'null', 'undefined', 'none', 'n/a', 'na', 'tbd', 'pending'];
      const trimmedInvoiceNumber = invoiceNumber ? invoiceNumber.trim() : '';
      const isInvalidPlaceholder = trimmedInvoiceNumber && invalidPlaceholders.includes(trimmedInvoiceNumber.toLowerCase());
      
      if (!invoiceNumber || trimmedInvoiceNumber === '' || isInvalidPlaceholder) {
        setUploadStatus('error');
        if (isInvalidPlaceholder) {
          setErrorMessage(`Invalid invoice number value: "${trimmedInvoiceNumber}". Please replace placeholder values (like "string", "null", etc.) with actual invoice numbers in your Excel file.`);
        } else {
          setErrorMessage('Invoice number is required. Please ensure your Excel file contains an "Invoice Number" column with actual invoice number values (not placeholders), and map it using the "Map Headers" button.');
        }
        setUploading(false);
        return;
      }
      
      // Ensure invoice_number is in the JSON
      if (!invoiceJson.invoice_number) {
        invoiceJson.invoice_number = trimmedInvoiceNumber;
      }

      // Add periodNum to the JSON payload
      invoiceJson.periodNum = trimmedPeriodNum;
      
      const { API_END_POINT } = await import('@/app/config/Api');
      
      const response = await fetch(API_END_POINT.INVOICE.UPLOAD_INVOICE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceJson)
      });
      
      // Get response text
      const responseText = await response.text();

      if (response.ok) {
        setUploadStatus('success');
        onUploadSuccess();
        
        // Clear file state on successful upload
        clearFileState();
        
        // Close dialog after success
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        // Try to parse error response
        let errorMessage = 'Upload failed. Please try again.';
        try {
          const errorData = JSON.parse(responseText);
          // Handle different error response formats
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.join(', ');
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else {
            errorMessage = JSON.stringify(errorData);
          }
        } catch (e) {
          // If response is not JSON, use the raw text
          errorMessage = responseText || `Server returned error: ${response.status} ${response.statusText}`;
        }
        setUploadStatus('error');
        setErrorMessage(errorMessage);
      }
    } catch (error) {
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
              {/* Period Number Input */}
              <div className="space-y-2">
                <label htmlFor="period-num" className="text-xs sm:text-sm font-medium text-slate-700">
                  Period Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="period-num"
                  value={periodNum}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                    if (value.length <= 6) {
                      setPeriodNum(value);
                    }
                  }}
                  placeholder="YYYYMM (e.g., 202512)"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="text-xs text-slate-500">
                  Enter the period number in YYYYMM format (e.g., 202512 for December 2025)
                </p>
              </div>

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
                  onClick={() => {
                    clearFileState();
                    onOpenChange(false);
                  }}
                  className="w-full sm:flex-1 text-xs sm:text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!file || !periodNum.trim() || uploading}
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

