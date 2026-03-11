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
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, Map, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/components/ui/utils';
import { FieldMappingDialog, type FieldMapping } from '@/components/modals/FieldMappingDialog';
import type { InvoiceField } from '@/components/utils/fieldMappingUtils';
import { INVOICE_FIELDS } from '@/components/utils/fieldMappingUtils';
import { useToast } from '@/components/ui/toaster';
import { Download } from 'lucide-react';

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
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([]); // Store missing fields from API errors
  const { addToast } = useToast();

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
      setMissingRequiredFields([]);
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
    // If headers are missing, try to restore from saved state
    if (header.length === 0) {
      const savedState = getSavedFileState();
      if (savedState && savedState.headers && savedState.headers.length > 0) {
        setHeader(savedState.headers);
        setPreview(true);
        setIsRestoredState(true);
        addToast({
          variant: "info",
          title: "Headers Restored",
          description: "Headers have been restored from your previous session.",
        });
      } else {
        // No headers available - user needs to upload file first
        addToast({
          variant: "error",
          title: "No Headers Available",
          description: "Please upload your Excel file first to see the headers for mapping.",
        });
        return; // Don't open mapping dialog if no headers
      }
    }
    // Show the mapping dialog
    setShowMappingDialog(true);
  };

  const handleSaveMappings = async (newMappings: FieldMapping, closeDialog: boolean = true) => {
    // Merge with existing mappings
    const existingMappings = getSavedMappings();
    const mergedMappings = { ...existingMappings, ...newMappings };
    saveMappings(mergedMappings);
    
    // Check if all required fields are now mapped
    const { getUnmappedRequiredFields } = await import('../utils/fieldMappingUtils');
    const unmappedRequired = getUnmappedRequiredFields(mergedMappings);
    
    // Clear error message if all required fields are mapped
    if (unmappedRequired.length === 0) {
      setErrorMessage('');
    }
    
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

      // Commented out periodNum validation
      // const trimmedPeriodNum = periodNum.trim();
      // if (!trimmedPeriodNum) {
      //   setUploadStatus('error');
      //   setErrorMessage('Period Number is required. Please enter a period number in YYYYMM format (e.g., 202512).');
      //   setUploading(false);
      //   return;
      // }

      // // Validate periodNum format: should be 6 digits, YYYYMM
      // const periodNumRegex = /^\d{6}$/;
      // if (!periodNumRegex.test(trimmedPeriodNum)) {
      //   setUploadStatus('error');
      //   setErrorMessage('Invalid Period Number format. Please enter a period number in YYYYMM format (e.g., 202512 for December 2025).');
      //   setUploading(false);
      //   return;
      // }

      // // Validate month is between 01-12
      // const month = parseInt(trimmedPeriodNum.slice(4, 6));
      // if (month < 1 || month > 12) {
      //   setUploadStatus('error');
      //   setErrorMessage('Invalid Period Number. Month must be between 01 and 12.');
      //   setUploading(false);
      //   return;
      // }

      const user = JSON.parse(userData);
      
      // Get mappings before using them
      const mappings = getSavedMappings();
      
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
        // Ensures field names are preserved exactly as specified (snake_case)
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
              // Use exact field name as specified (preserve snake_case)
              // FIX: If current[part] exists but is a primitive (string, number, etc.), convert it to an object
              // This prevents "Cannot create property 'lga' on string 'W2 8HG'" errors
              if (!current[part]) {
                current[part] = {};
              } else if (typeof current[part] !== 'object' || Array.isArray(current[part])) {
                // If it's a primitive or array, convert to object to allow nested properties
                // This happens when postal_address was set as a string, then we try to set postal_address.lga
                console.warn(`⚠️ Converting ${part} from ${typeof current[part]} to object to allow nested properties`);
                current[part] = {};
              }
              current = current[part];
            }
          }
          // Use exact field name for the final property (preserve snake_case like price_unit, not priceUnit)
          const lastPart = parts[parts.length - 1];
          current[lastPart] = value;
        };
        
        // Initialize invoice JSON with business_id from user (will be overridden if mapped)
        invoiceJson.business_id = user.business_id || user.id;
        
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
        
        // Process all data rows (row index 1 onwards, since 0 is headers)
        // Group rows by invoice_number if multiple rows exist
        const dataRows = jsonData.slice(1).filter(row => row && row.length > 0);
        
        if (dataRows.length === 0) {
          setUploadStatus('error');
          setErrorMessage('No data rows found in Excel file.');
          setUploading(false);
          return;
        }
        
        // List of date fields that need formatting
        const dateFields = ['issue_date', 'due_date', 'tax_point_date', 'actual_delivery_date', 
                           'invoice_delivery_period.start_date', 'invoice_delivery_period.end_date'];
        
        // Separate fields into invoice-level (from first row) and line-item level (from all rows)
        const invoiceLineFields: string[] = [];
        const invoiceLevelFields: string[] = [];
        
        for (const mappedField of Object.values(mappings)) {
          if (mappedField && mappedField.includes('invoice_line[]')) {
            invoiceLineFields.push(mappedField);
          } else {
            invoiceLevelFields.push(mappedField);
          }
        }
        
        // Process invoice-level fields from first row
        const firstDataRow = dataRows[0];
        for (const [excelHeader, mappedField] of Object.entries(mappings)) {
          // Skip invoice_line fields - they'll be processed per row
          if (mappedField && mappedField.includes('invoice_line[]')) {
            continue;
          }
          // Skip if mapped to 'skip' or empty
          if (mappedField === 'skip' || !mappedField) {
            continue;
          }
          
          // Handle business_id - use mapped value if provided, otherwise keep auto-mapped value
          if (mappedField === 'business_id') {
            // Find column index for this Excel header (case-insensitive match)
            const columnIndex = headerRow.findIndex(h => 
              String(h || '').trim().toLowerCase() === String(excelHeader || '').trim().toLowerCase()
            );
            
            if (columnIndex >= 0 && firstDataRow && firstDataRow[columnIndex] !== undefined) {
              let value: any = firstDataRow[columnIndex];
              
              // Convert to string and trim
              if (value !== null && value !== undefined) {
                value = String(value).trim();
                if (value) {
                  invoiceJson.business_id = value; // Use mapped value
                }
              }
            }
            continue; // Continue to next field after handling business_id
          }
          
          // Find column index for this Excel header (case-insensitive match)
          const columnIndex = headerRow.findIndex(h => 
            String(h || '').trim().toLowerCase() === String(excelHeader || '').trim().toLowerCase()
          );
          
          // Fields that should be included even if empty (part of required structures)
          const includeEmptyFields = [
            'postal_address.lga', 'postal_address.postal_zone', 'postal_address.state',
            'line_extension_amount', 'price.price_amount'
          ];
          const shouldIncludeEmpty = includeEmptyFields.some(field => mappedField.includes(field));
          
          if (columnIndex >= 0 && firstDataRow && firstDataRow[columnIndex] !== undefined) {
            let value: any = firstDataRow[columnIndex];
            
            // Skip empty values unless they're part of required structures
            if (!shouldIncludeEmpty && (value === null || value === undefined || value === '')) {
              continue;
            }
            
            // For fields that should be included even if empty, set to empty string
            if (shouldIncludeEmpty && (value === null || value === undefined || value === '')) {
              value = '';
            }
            
            // List of fields that must remain strings (not converted to numbers)
            const stringOnlyFields = ['price_unit', 'product_category', 'hsn_code', 'invoice_type_code', 
                                     'document_currency_code', 'tax_currency_code', 'payment_means_code', 'payment_status',
                                     'party_name', 'email', 'telephone', 'business_description', 'street_name', 
                                     'city_name', 'postal_zone', 'country', 'state', 'lga', 'note', 'payment_terms_note',
                                     'buyer_reference', 'order_reference', 'accounting_cost', 'item.name', 'item.description',
                                     'item.sellers_item_identification', 'tax_category.id'];
            
            const mustBeString = stringOnlyFields.some(sf => mappedField.includes(sf));
            
            // Convert value based on type
            if (typeof value === 'string') {
              value = String(value).trim();
              
              // Skip if empty after trim (unless it's a field that should be included even if empty)
              if (!shouldIncludeEmpty && !value) {
                continue;
              }
              
              // For fields that should be included, keep empty string
              if (shouldIncludeEmpty && !value) {
                value = '';
              }
              
              // Format dates to ISO format (YYYY-MM-DD)
              const isDateField = dateFields.some(df => {
                const fieldBase = df.split('.')[0];
                return mappedField === df || mappedField.startsWith(fieldBase + '.') || mappedField.includes(fieldBase);
              });
              
              if (isDateField) {
                const formattedDate = formatDate(value);
                // Only use if it's a valid date format (YYYY-MM-DD)
                if (formattedDate && typeof formattedDate === 'string' && formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                  value = formattedDate;
                } else {
                  // Skip invalid dates
                  continue;
                }
              } else if (!mustBeString) {
                // Try to convert numbers for numeric fields only (exclude string-only fields)
                const numericFields = ['invoiced_quantity', 'line_extension_amount', 'price_amount', 'base_quantity', 
                                     'tax_amount', 'taxable_amount', 'payable_amount', 'tax_exclusive_amount', 
                                     'tax_inclusive_amount', 'discount_amount', 'discount_rate', 'fee_amount', 'fee_rate', 'percent'];
                
                const isNumericField = numericFields.some(nf => mappedField.includes(nf));
                
                if (isNumericField && !isNaN(Number(value)) && value !== '') {
                  const numValue = Number(value);
                  if (!isNaN(numValue)) {
                    value = numValue;
                  }
                }
                // String-only fields remain as strings
              }
              // If mustBeString is true, value remains as string
            } else if (typeof value === 'number') {
              // If this field must be a string, convert number to string
              if (mustBeString) {
                value = String(value);
              } else {
                // Check if this is a date field that might be stored as Excel serial number
                const isDateField = dateFields.some(df => {
                  const fieldBase = df.split('.')[0];
                  return mappedField === df || mappedField.startsWith(fieldBase + '.') || mappedField.includes(fieldBase);
                });
                if (isDateField) {
                  const formattedDate = formatDate(value);
                  // Only use if it's a valid date format
                  if (formattedDate && typeof formattedDate === 'string' && formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    value = formattedDate;
                  } else {
                    continue;
                  }
                }
                // Otherwise, number remains as number for numeric fields
              }
            }
            
            // Skip placeholder values
            const invalidPlaceholders = ['string', 'null', 'undefined', 'none', 'n/a', 'na', 'tbd', 'pending'];
            if (typeof value === 'string' && invalidPlaceholders.includes(value.toLowerCase())) {
              continue;
            }
            
            // Set the value in the JSON structure
            // Ensure field names match API format (snake_case)
            if (mappedField.includes('[]')) {
              // Array field like invoice_line[].item.name or invoice_line[].price.price_unit
              const arrayMatch = mappedField.match(/^([^[]+)\[\]\.?(.*)$/);
              if (arrayMatch) {
                const arrayName = arrayMatch[1]; // e.g., "invoice_line"
                const fieldPath = arrayMatch[2] || ''; // e.g., "price.price_unit" or "item.name"
                
                if (!invoiceJson[arrayName]) {
                  invoiceJson[arrayName] = [];
                }
                if (invoiceJson[arrayName].length === 0) {
                  invoiceJson[arrayName].push({});
                }
                
                if (fieldPath) {
                  // Set nested property ensuring snake_case field names
                  // fieldPath example: "price.price_unit" -> creates { price: { price_unit: value } }
                  setNestedProperty(invoiceJson[arrayName][0], fieldPath, value);
                  
                  // Debug log for price fields
                  if (fieldPath.includes('price')) {
                    console.log(`🔧 Setting ${arrayName}[0].${fieldPath} =`, value, typeof value);
                  }
                } else {
                  invoiceJson[arrayName][0] = value;
                }
              }
            } else if (mappedField.includes('.')) {
              // Nested field like accounting_supplier_party.party_name or legal_monetary_total.payable_amount
              setNestedProperty(invoiceJson, mappedField, value);
            } else {
              // Simple field - ensure snake_case
              invoiceJson[mappedField] = value;
            }
            
            // Track invoice_number for validation
            if (mappedField === 'invoice_number') {
              invoiceNumber = String(value).trim();
            }
          }
        }
        
        // Process invoice_line items from all rows
        const invoiceLines: any[] = [];
        
        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
          const row = dataRows[rowIndex];
          const lineItem: any = {};
          
          // Process each invoice_line field mapping
          for (const [excelHeader, mappedField] of Object.entries(mappings)) {
            if (!mappedField || !mappedField.includes('invoice_line[]')) {
              continue;
            }
            
            // Skip if mapped to 'skip' or empty
            if (mappedField === 'skip' || !mappedField) {
              continue;
            }
            
            // Find column index for this Excel header
            const columnIndex = headerRow.findIndex(h => 
              String(h || '').trim().toLowerCase() === String(excelHeader || '').trim().toLowerCase()
            );
            
            if (columnIndex >= 0 && row && row[columnIndex] !== undefined) {
              let value: any = row[columnIndex];
              
              // Fields that should be included even if empty
              const includeEmptyFields = [
                'postal_address.lga', 'postal_address.postal_zone', 'postal_address.state',
                'line_extension_amount', 'price.price_amount'
              ];
              const shouldIncludeEmpty = includeEmptyFields.some(field => mappedField.includes(field));
              
              // Skip empty values unless they're part of required structures
              if (!shouldIncludeEmpty && (value === null || value === undefined || value === '')) {
                continue;
              }
              
              // For fields that should be included even if empty, set to empty string
              if (shouldIncludeEmpty && (value === null || value === undefined || value === '')) {
                value = '';
              }
              
              // List of fields that must remain strings
              const stringOnlyFields = ['price_unit', 'product_category', 'hsn_code', 'invoice_type_code', 
                                       'document_currency_code', 'tax_currency_code', 'payment_means_code', 'payment_status',
                                       'party_name', 'email', 'telephone', 'business_description', 'street_name', 
                                       'city_name', 'postal_zone', 'country', 'state', 'lga', 'note', 'payment_terms_note',
                                       'buyer_reference', 'order_reference', 'accounting_cost', 'item.name', 'item.description',
                                       'item.sellers_item_identification', 'tax_category.id'];
              
              const mustBeString = stringOnlyFields.some(sf => mappedField.includes(sf));
              
              // Convert value based on type
              if (typeof value === 'string') {
                value = String(value).trim();
                
                if (!shouldIncludeEmpty && !value) {
                  continue;
                }
                
                if (shouldIncludeEmpty && !value) {
                  value = '';
                }
                
                // Format dates
                const isDateField = dateFields.some(df => {
                  const fieldBase = df.split('.')[0];
                  return mappedField === df || mappedField.startsWith(fieldBase + '.') || mappedField.includes(fieldBase);
                });
                
                if (isDateField) {
                  const formattedDate = formatDate(value);
                  if (formattedDate && typeof formattedDate === 'string' && formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    value = formattedDate;
                  } else {
                    continue;
                  }
                } else if (!mustBeString) {
                  // Convert numbers for numeric fields
                  const numericFields = ['invoiced_quantity', 'line_extension_amount', 'price_amount', 'base_quantity', 
                                       'tax_amount', 'taxable_amount', 'payable_amount', 'tax_exclusive_amount', 
                                       'tax_inclusive_amount', 'discount_amount', 'discount_rate', 'fee_amount', 'fee_rate', 'percent'];
                  
                  const isNumericField = numericFields.some(nf => mappedField.includes(nf));
                  
                  if (isNumericField && !isNaN(Number(value)) && value !== '') {
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                      value = numValue;
                    }
                  }
                }
              } else if (typeof value === 'number') {
                if (mustBeString) {
                  value = String(value);
                } else {
                  const isDateField = dateFields.some(df => {
                    const fieldBase = df.split('.')[0];
                    return mappedField === df || mappedField.startsWith(fieldBase + '.') || mappedField.includes(fieldBase);
                  });
                  if (isDateField) {
                    const formattedDate = formatDate(value);
                    if (formattedDate && typeof formattedDate === 'string' && formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                      value = formattedDate;
                    } else {
                      continue;
                    }
                  }
                }
              }
              
              // Skip placeholder values
              const invalidPlaceholders = ['string', 'null', 'undefined', 'none', 'n/a', 'na', 'tbd', 'pending'];
              if (typeof value === 'string' && invalidPlaceholders.includes(value.toLowerCase())) {
                continue;
              }
              
              // Extract field path for invoice_line (remove invoice_line[] prefix)
              const fieldPath = mappedField.replace(/^invoice_line\[\]\.?/, '');
              
              if (fieldPath) {
                // Set nested property in line item
                setNestedProperty(lineItem, fieldPath, value);
              } else {
                lineItem[mappedField] = value;
              }
            }
          }
          
          // Always ensure required fields are initialized in lineItem before adding
          // This ensures the structure exists even if fields aren't mapped
          if (!lineItem.item) lineItem.item = {};
          if (!lineItem.price) lineItem.price = {};
          
          // Initialize required fields if not present (will be properly set in post-processing)
          if (lineItem.hsn_code === undefined) lineItem.hsn_code = '';
          if (lineItem.invoiced_quantity === undefined) lineItem.invoiced_quantity = 0;
          if (!lineItem.item.name) lineItem.item.name = '';
          if (lineItem.product_category === undefined) lineItem.product_category = '';
          if (lineItem.price.price_amount === undefined) lineItem.price.price_amount = 0;
          if (!lineItem.price.price_unit) lineItem.price.price_unit = 'NGN per 1';
          if (lineItem.price.base_quantity === undefined) lineItem.price.base_quantity = 1;
          if (lineItem.line_extension_amount === undefined) lineItem.line_extension_amount = 0;
          
          // Always add the line item - API needs to see it to validate required fields
          // Even if it appears empty, it has the required structure
          invoiceLines.push(lineItem);
        }
        
        // Set invoice_line array - always set it, even if items appear empty
        // API needs to see the structure to validate required fields
        invoiceJson.invoice_line = invoiceLines;
        
      } catch (error) {
        setUploadStatus('error');
        setErrorMessage('Error parsing Excel file. Please check the file format.');
        setUploading(false);
        return;
      }
      
      // Allow upload without mapping - API will validate and return errors if fields are missing
      // Only validate invoice_number if it was mapped, otherwise let API handle it
      const invalidPlaceholders = ['string', 'null', 'undefined', 'none', 'n/a', 'na', 'tbd', 'pending'];
      const trimmedInvoiceNumber = invoiceNumber ? invoiceNumber.trim() : '';
      const isInvalidPlaceholder = trimmedInvoiceNumber && invalidPlaceholders.includes(trimmedInvoiceNumber.toLowerCase());
      
      // Only validate invoice_number if it was explicitly mapped
      if (invoiceNumber && (trimmedInvoiceNumber === '' || isInvalidPlaceholder)) {
        setUploading(false);
        setUploadStatus('idle');
        if (isInvalidPlaceholder) {
          setErrorMessage(`Invalid invoice number value: "${trimmedInvoiceNumber}". Please map a valid "Invoice Number" column with actual invoice number values (not placeholders).`);
        } else {
          setErrorMessage('Invoice number is required. Please map the "Invoice Number" field in the mapping dialog.');
        }
        return;
      }
      
      // Ensure invoice_number is in the JSON if it was mapped
      if (invoiceNumber && trimmedInvoiceNumber && !isInvalidPlaceholder) {
        invoiceJson.invoice_number = trimmedInvoiceNumber;
      }

      // Ensure required fields are present even if empty (API requires them for validation)
      // Always initialize postal_address fields if supplier/customer party exists
      if (invoiceJson.accounting_supplier_party) {
        if (!invoiceJson.accounting_supplier_party.postal_address) {
          invoiceJson.accounting_supplier_party.postal_address = {};
        }
        const supplierPostal = invoiceJson.accounting_supplier_party.postal_address;
        // Always ensure all required postal_address fields are present (even if empty)
        // API requires: lga, postal_zone, state
        supplierPostal.lga = supplierPostal.lga !== undefined && supplierPostal.lga !== null && supplierPostal.lga !== '' 
          ? supplierPostal.lga : '';
        supplierPostal.postal_zone = supplierPostal.postal_zone !== undefined && supplierPostal.postal_zone !== null && supplierPostal.postal_zone !== '' 
          ? supplierPostal.postal_zone : '';
        supplierPostal.state = supplierPostal.state !== undefined && supplierPostal.state !== null && supplierPostal.state !== '' 
          ? supplierPostal.state : '';
      }
      
      if (invoiceJson.accounting_customer_party) {
        if (!invoiceJson.accounting_customer_party.postal_address) {
          invoiceJson.accounting_customer_party.postal_address = {};
        }
        const customerPostal = invoiceJson.accounting_customer_party.postal_address;
        // Always ensure all required postal_address fields are present (even if empty)
        // API requires: lga, postal_zone, state
        customerPostal.lga = customerPostal.lga !== undefined && customerPostal.lga !== null && customerPostal.lga !== '' 
          ? customerPostal.lga : '';
        customerPostal.postal_zone = customerPostal.postal_zone !== undefined && customerPostal.postal_zone !== null && customerPostal.postal_zone !== '' 
          ? customerPostal.postal_zone : '';
        customerPostal.state = customerPostal.state !== undefined && customerPostal.state !== null && customerPostal.state !== '' 
          ? customerPostal.state : '';
      }
      
      // Ensure invoice_line exists and has required fields (required by API)
      // API requires: hsn_code, invoiced_quantity, item.name, product_category for each invoice_line item
      if (!invoiceJson.invoice_line || !Array.isArray(invoiceJson.invoice_line) || invoiceJson.invoice_line.length === 0) {
        // If no invoice_line items, create empty array - API will validate and show error
        invoiceJson.invoice_line = [];
      } else {
        // Clean up and structure invoice_line items, ensuring required fields are ALWAYS present
        invoiceJson.invoice_line = invoiceJson.invoice_line.map((line: any) => {
          // Ensure nested structures exist
          if (!line.item) line.item = {};
          if (!line.price) line.price = {};
          
          // Handle item.name - ensure item object exists
          if (line['item.name'] !== undefined) {
            line.item.name = line['item.name'];
            delete line['item.name'];
          }
          
          // Handle price fields
          if (line.price_amount !== undefined) {
            line.price.price_amount = line.price_amount;
            delete line.price_amount;
          }
          if (line['price.price_amount'] !== undefined) {
            line.price.price_amount = line['price.price_amount'];
            delete line['price.price_amount'];
          }
          
          // CRITICAL: Always ensure required fields are present (API requires them even if empty)
          // These fields MUST be in the payload for API validation to work
          // Backend expects: invoiceline[0].hsncode, invoiceline[0].invoicedquantity, 
          // invoiceline[0].item.name, invoiceline[0].productcategory
          
          // hsn_code - required, must be present (empty string if not mapped)
          if (line.hsn_code === undefined || line.hsn_code === null) {
            line.hsn_code = '';
          } else {
            line.hsn_code = String(line.hsn_code).trim();
          }
          
          // invoiced_quantity - required, must be present (0 if not mapped)
          if (line.invoiced_quantity === undefined || line.invoiced_quantity === null || line.invoiced_quantity === '') {
            line.invoiced_quantity = 0;
          } else {
            // Ensure it's a number
            const numValue = typeof line.invoiced_quantity === 'string' 
              ? (isNaN(Number(line.invoiced_quantity)) ? 0 : Number(line.invoiced_quantity))
              : Number(line.invoiced_quantity);
            line.invoiced_quantity = isNaN(numValue) ? 0 : numValue;
          }
          
          // item.name - required, must be present (empty string if not mapped)
          if (line.item.name === undefined || line.item.name === null || line.item.name === '') {
            line.item.name = '';
          } else {
            line.item.name = String(line.item.name).trim();
          }
          
          // product_category - required, must be present (empty string if not mapped)
          if (line.product_category === undefined || line.product_category === null) {
            line.product_category = '';
          } else {
            line.product_category = String(line.product_category).trim();
          }
          
          // Ensure price structure is complete
          if (line.price.price_amount === undefined || line.price.price_amount === null) {
            line.price.price_amount = 0;
          }
          if (!line.price.price_unit || line.price.price_unit === '') {
            line.price.price_unit = 'NGN per 1';
          }
          if (line.price.base_quantity === undefined || line.price.base_quantity === null || line.price.base_quantity === '') {
            line.price.base_quantity = 1;
          }
          
          // Ensure line_extension_amount is present
          if (line.line_extension_amount === undefined || line.line_extension_amount === null) {
            line.line_extension_amount = 0;
          }
          
          return line;
        });
        
        // Don't filter out items - API needs to see them even if empty to validate
        // The backend will return specific errors for missing required fields
      }
      
      // Ensure legal_monetary_total structure exists and has required fields (required by API)
      if (!invoiceJson.legal_monetary_total) {
        invoiceJson.legal_monetary_total = {};
      }
      
      // API requires line_extension_amount to be present
      if (invoiceJson.legal_monetary_total.line_extension_amount === undefined || 
          invoiceJson.legal_monetary_total.line_extension_amount === null) {
        // Calculate from invoice_line if available, otherwise set to 0
        const totalLineExtension = invoiceJson.invoice_line?.reduce((sum: number, line: any) => {
          return sum + (line.line_extension_amount || 0);
        }, 0) || 0;
        invoiceJson.legal_monetary_total.line_extension_amount = totalLineExtension;
      }
      
      // Ensure other legal_monetary_total fields have defaults if missing
      if (invoiceJson.legal_monetary_total.payable_amount === undefined || 
          invoiceJson.legal_monetary_total.payable_amount === null) {
        invoiceJson.legal_monetary_total.payable_amount = 
          invoiceJson.legal_monetary_total.tax_inclusive_amount || 
          invoiceJson.legal_monetary_total.line_extension_amount || 0;
      }
      if (invoiceJson.legal_monetary_total.tax_exclusive_amount === undefined || 
          invoiceJson.legal_monetary_total.tax_exclusive_amount === null) {
        invoiceJson.legal_monetary_total.tax_exclusive_amount = 
          invoiceJson.legal_monetary_total.line_extension_amount || 0;
      }
      if (invoiceJson.legal_monetary_total.tax_inclusive_amount === undefined || 
          invoiceJson.legal_monetary_total.tax_inclusive_amount === null) {
        invoiceJson.legal_monetary_total.tax_inclusive_amount = 
          invoiceJson.legal_monetary_total.payable_amount || 
          invoiceJson.legal_monetary_total.line_extension_amount || 0;
      }
      
      // Set default values for required fields if not provided
      if (!invoiceJson.payment_status) {
        invoiceJson.payment_status = 'PENDING';
      }
      
      // Ensure payment_means is an array (required by API)
      if (!invoiceJson.payment_means) {
        invoiceJson.payment_means = [];
        // Add default payment_means if due_date exists
        if (invoiceJson.due_date) {
          invoiceJson.payment_means.push({
            payment_due_date: invoiceJson.due_date,
            payment_means_code: '42' // Default payment means code
          });
        }
      } else if (!Array.isArray(invoiceJson.payment_means)) {
        // Convert to array if it's not already
        invoiceJson.payment_means = [invoiceJson.payment_means];
      }
      
      // Ensure tax_total is properly structured (required by API)
      // API requires: tax_total[].tax_amount, tax_total[].tax_subtotal[].taxable_amount, 
      // tax_total[].tax_subtotal[].tax_amount, tax_total[].tax_subtotal[].tax_category.percent
      if (!invoiceJson.tax_total || !Array.isArray(invoiceJson.tax_total) || invoiceJson.tax_total.length === 0) {
        // Auto-generate tax_total structure if not provided
        // Calculate from legal_monetary_total if available
        const taxExclusive = invoiceJson.legal_monetary_total?.tax_exclusive_amount || 
                           invoiceJson.legal_monetary_total?.line_extension_amount || 0;
        const taxInclusive = invoiceJson.legal_monetary_total?.tax_inclusive_amount || 0;
        const taxAmount = taxInclusive > 0 && taxExclusive > 0 ? taxInclusive - taxExclusive : 0;
        const taxPercent = taxExclusive > 0 && taxAmount > 0 ? (taxAmount / taxExclusive) * 100 : 7.5;
        
        invoiceJson.tax_total = [
          {
            tax_amount: taxAmount || 0,
            tax_subtotal: [
              {
                taxable_amount: taxExclusive || 0,
                tax_amount: taxAmount || 0,
                tax_category: {
                  id: 'STANDARD_VAT',
                  percent: taxPercent
                }
              }
            ]
          }
        ];
      } else {
        // Ensure tax_total structure is complete - fix any missing fields
        invoiceJson.tax_total = invoiceJson.tax_total.map((taxItem: any) => {
          if (!taxItem.tax_subtotal || !Array.isArray(taxItem.tax_subtotal) || taxItem.tax_subtotal.length === 0) {
            // Create default tax_subtotal if missing
            const taxAmount = taxItem.tax_amount || 0;
            const taxExclusive = invoiceJson.legal_monetary_total?.tax_exclusive_amount || 
                               invoiceJson.legal_monetary_total?.line_extension_amount || 0;
            const taxPercent = taxExclusive > 0 && taxAmount > 0 ? (taxAmount / taxExclusive) * 100 : 7.5;
            
            taxItem.tax_subtotal = [
              {
                taxable_amount: taxExclusive || 0,
                tax_amount: taxAmount || 0,
                tax_category: {
                  id: taxItem.tax_category?.id || 'STANDARD_VAT',
                  percent: taxItem.tax_category?.percent || taxPercent
                }
              }
            ];
          } else {
            // Ensure each tax_subtotal has all required fields
            taxItem.tax_subtotal = taxItem.tax_subtotal.map((subtotal: any) => {
              const taxAmount = subtotal.tax_amount !== undefined ? subtotal.tax_amount : 
                              (taxItem.tax_amount || 0);
              const taxExclusive = invoiceJson.legal_monetary_total?.tax_exclusive_amount || 
                                 invoiceJson.legal_monetary_total?.line_extension_amount || 0;
              const taxPercent = taxExclusive > 0 && taxAmount > 0 ? (taxAmount / taxExclusive) * 100 : 
                               (subtotal.tax_category?.percent || 7.5);
              
              return {
                taxable_amount: subtotal.taxable_amount !== undefined ? subtotal.taxable_amount : taxExclusive || 0,
                tax_amount: subtotal.tax_amount !== undefined ? subtotal.tax_amount : taxAmount || 0,
                tax_category: {
                  id: subtotal.tax_category?.id || 'STANDARD_VAT',
                  percent: subtotal.tax_category?.percent !== undefined ? subtotal.tax_category.percent : taxPercent
                }
              };
            });
          }
          
          // Ensure tax_amount at top level matches sum of subtotals
          if (!taxItem.tax_amount || taxItem.tax_amount === 0) {
            taxItem.tax_amount = taxItem.tax_subtotal.reduce((sum: number, st: any) => sum + (st.tax_amount || 0), 0);
          }
          
          return taxItem;
        });
      }
      
      // Set default currency codes if not provided
      if (!invoiceJson.document_currency_code) {
        invoiceJson.document_currency_code = 'NGN';
      }
      if (!invoiceJson.tax_currency_code) {
        invoiceJson.tax_currency_code = 'NGN';
      }
      
      // Set default invoice_type_code if not provided
      if (!invoiceJson.invoice_type_code) {
        invoiceJson.invoice_type_code = '381';
      }

      // Commented out periodNum assignment
      // invoiceJson.periodNum = trimmedPeriodNum;
      
      // Validate payload has minimum required structure before sending
      const payload = invoiceJson;
      
      // Check for missing critical fields and log warnings
      const missingFields: string[] = [];
      if (!payload.business_id) missingFields.push('business_id');
      if (!payload.invoice_number || payload.invoice_number === '') missingFields.push('invoice_number');
      if (!payload.issue_date) missingFields.push('issue_date');
      if (!payload.invoice_type_code) missingFields.push('invoice_type_code');
      if (!payload.document_currency_code) missingFields.push('document_currency_code');
      if (!payload.tax_currency_code) missingFields.push('tax_currency_code');
      if (!payload.accounting_supplier_party) missingFields.push('accounting_supplier_party');
      if (!payload.legal_monetary_total) missingFields.push('legal_monetary_total');
      if (!payload.invoice_line || payload.invoice_line.length === 0) {
        missingFields.push('invoice_line');
      } else {
        // Validate each invoice_line item has required fields
        payload.invoice_line.forEach((line: any, index: number) => {
          const requiredLineFields = [
            { field: 'hsn_code', path: 'hsn_code' },
            { field: 'invoiced_quantity', path: 'invoiced_quantity' },
            { field: 'item.name', path: 'item.name', nested: true },
            { field: 'line_extension_amount', path: 'line_extension_amount' },
            { field: 'price.price_amount', path: 'price.price_amount', nested: true },
            { field: 'product_category', path: 'product_category' }
          ];
          
          requiredLineFields.forEach(({ field, path, nested }) => {
            let value;
            if (nested) {
              const keys = path.split('.');
              value = keys.reduce((obj: any, key: string) => obj?.[key], line);
            } else {
              value = line[path];
            }
            
            if (value === undefined || value === null || value === '' || 
                (typeof value === 'number' && isNaN(value))) {
              missingFields.push(`invoiceline[${index}].${field.replace(/\./g, '').toLowerCase()}`);
            }
          });
        });
      }
      if (!payload.tax_total) missingFields.push('tax_total');
      
      // Log payload for debugging
      console.log('📤 Invoice Payload being sent:', JSON.stringify(payload, null, 2));
      console.log('📊 Payload structure check:', {
        hasBusinessId: !!payload.business_id,
        hasInvoiceNumber: !!payload.invoice_number,
        hasIssueDate: !!payload.issue_date,
        hasInvoiceTypeCode: !!payload.invoice_type_code,
        hasDocumentCurrencyCode: !!payload.document_currency_code,
        hasTaxCurrencyCode: !!payload.tax_currency_code,
        hasSupplierParty: !!payload.accounting_supplier_party,
        hasCustomerParty: !!payload.accounting_customer_party,
        hasLegalMonetaryTotal: !!payload.legal_monetary_total,
        hasInvoiceLine: !!payload.invoice_line && payload.invoice_line.length > 0,
        hasTaxTotal: !!payload.tax_total,
        invoiceLineCount: payload.invoice_line?.length || 0,
        missingFields: missingFields.length > 0 ? missingFields : 'none'
      });
      
      // Warn in console if critical fields are missing (but still send - let API validate)
      if (missingFields.length > 0) {
        console.warn('⚠️ Missing fields in payload (API will return validation errors):', missingFields);
      }
      
      // Clean payload to remove invalid JSON values and fix data type issues
      const cleanPayload = (obj: any, path: string = ''): any => {
        if (obj === null || obj === undefined) {
          return null;
        }
        
        if (typeof obj === 'number') {
          // Replace NaN and Infinity with 0
          if (isNaN(obj) || !isFinite(obj)) {
            console.warn(`⚠️ Invalid number at ${path}, replacing with 0`);
            return 0;
          }
          return obj;
        }
        
        if (typeof obj === 'string') {
          // Ensure string is valid (not undefined/null as string)
          if (obj === 'undefined' || obj === 'null') {
            return '';
          }
          
          // Fix common data type mismatches
          const trimmed = obj.trim();
          
          // Check if it's a date field that should be a date
          const isDateField = path.includes('date') || path.includes('Date');
          if (isDateField) {
            // Validate date format (YYYY-MM-DD) and year is reasonable (1900-2100)
            if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const year = parseInt(trimmed.substring(0, 4));
              if (year >= 1900 && year <= 2100) {
                return trimmed;
              } else {
                console.warn(`⚠️ Invalid year in date at ${path}: "${trimmed}"`);
                // Try to parse and reformat
                const parsed = new Date(trimmed);
                if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
                  return parsed.toISOString().split('T')[0];
                }
                return '';
              }
            } else {
              console.warn(`⚠️ Invalid date format at ${path}: "${trimmed}"`);
              // Try to parse and reformat
              const parsed = new Date(trimmed);
              if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1900 && parsed.getFullYear() <= 2100) {
                return parsed.toISOString().split('T')[0];
              }
              // If can't parse, return empty string (will be caught by validation)
              return '';
            }
          }
          
          // Check if it's a currency code field
          if (path.includes('currency_code')) {
            // Extract currency code (should be 3 letters like "NGN")
            const currencyMatch = trimmed.match(/\b([A-Z]{3})\b/);
            if (currencyMatch) {
              return currencyMatch[1];
            }
            // If it looks like a date, number, or contains "NGN" in wrong format, use default
            if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/) || !isNaN(Number(trimmed)) || trimmed.includes('NGN')) {
              console.warn(`⚠️ Currency code field has wrong value at ${path}: "${trimmed}", using default "NGN"`);
              return 'NGN';
            }
            // If empty or invalid, default to NGN
            return 'NGN';
          }
          
          // Check if it's invoice_type_code (should be a code like "381")
          if (path.includes('invoice_type_code')) {
            // If it's a date, it's wrong
            if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
              console.warn(`⚠️ invoice_type_code has date value at ${path}: "${trimmed}", using default "381"`);
              return '381';
            }
            // If it's a valid code (3 digits), use it
            if (trimmed.match(/^\d{3}$/)) {
              return trimmed;
            }
            // Otherwise default
            return '381';
          }
          
          // Check if it's a numeric field that has a string value
          const isNumericField = path.includes('amount') || path.includes('quantity') || 
                                path.includes('percent') || path.includes('rate') ||
                                path.includes('taxable_amount') || path.includes('tax_amount');
          if (isNumericField) {
            // If it's "NGN per 1" or similar, it's wrong - try to extract number
            const numberMatch = trimmed.match(/(\d+\.?\d*)/);
            if (numberMatch) {
              const num = parseFloat(numberMatch[1]);
              if (!isNaN(num)) {
                console.warn(`⚠️ Numeric field has string value at ${path}: "${trimmed}", extracted: ${num}`);
                return num;
              }
            }
            // If it's a valid number string, convert it
            if (!isNaN(Number(trimmed)) && trimmed !== '') {
              return Number(trimmed);
            }
            // If it's empty or invalid, return 0
            console.warn(`⚠️ Numeric field has invalid value at ${path}: "${trimmed}", using 0`);
            return 0;
          }
          
          // Check if it's tax_category.id (should be like "STANDARD_VAT")
          if (path.includes('tax_category') && path.includes('id')) {
            // If it's not a valid tax category ID, use default
            if (!trimmed.match(/^[A-Z_]+$/)) {
              console.warn(`⚠️ tax_category.id has invalid value at ${path}: "${trimmed}", using default "STANDARD_VAT"`);
              return 'STANDARD_VAT';
            }
          }
          
          return trimmed;
        }
        
        if (Array.isArray(obj)) {
          return obj.map((item, index) => cleanPayload(item, `${path}[${index}]`)).filter(item => item !== undefined);
        }
        
        if (typeof obj === 'object') {
          const cleaned: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const newPath = path ? `${path}.${key}` : key;
              const value = cleanPayload(obj[key], newPath);
              // Include value if it's not undefined
              // Keep empty strings and 0 for required fields (API needs them for validation)
              if (value !== undefined) {
                cleaned[key] = value;
              } else if (newPath.includes('invoice_line') && (
                key === 'hsn_code' || 
                key === 'invoiced_quantity' || 
                key === 'product_category' ||
                key === 'line_extension_amount' ||
                (key === 'item' && obj[key] && typeof obj[key] === 'object') ||
                (key === 'price' && obj[key] && typeof obj[key] === 'object')
              )) {
                // For required invoice_line fields, ensure they're included even if undefined
                // This ensures the structure exists for API validation
                if (key === 'hsn_code' || key === 'product_category') {
                  cleaned[key] = '';
                } else if (key === 'invoiced_quantity' || key === 'line_extension_amount') {
                  cleaned[key] = 0;
                } else {
                  cleaned[key] = obj[key]; // Keep nested objects
                }
              }
            }
          }
          return cleaned;
        }
        
        return obj;
      };
      
      const cleanedPayload = cleanPayload(payload);
      
      // Additional validation for common mapping errors
      const validationErrors: string[] = [];
      
      // Check for obvious mapping errors
      if (cleanedPayload.document_currency_code && cleanedPayload.document_currency_code.match(/^\d{4}-\d{2}-\d{2}$/)) {
        validationErrors.push('document_currency_code appears to be a date. Please map it to a currency code column (e.g., "NGN").');
      }
      if (cleanedPayload.tax_currency_code && cleanedPayload.tax_currency_code.match(/^\d{4}-\d{2}-\d{2}$/)) {
        validationErrors.push('tax_currency_code appears to be a date. Please map it to a currency code column (e.g., "NGN").');
      }
      if (cleanedPayload.invoice_type_code && cleanedPayload.invoice_type_code.match(/^\d{4}-\d{2}-\d{2}$/)) {
        validationErrors.push('invoice_type_code appears to be a date. Please map it to an invoice type code column (e.g., "381").');
      }
      if (cleanedPayload.accounting_supplier_party?.party_name && cleanedPayload.accounting_supplier_party.party_name.match(/^\d{4}-\d{2}-\d{2}$/)) {
        validationErrors.push('accounting_supplier_party.party_name appears to be a date. Please map it to a supplier name column.');
      }
      
      // Check for invalid dates
      if (cleanedPayload.due_date && cleanedPayload.due_date.match(/^0\d{3}-\d{2}-\d{2}$/)) {
        validationErrors.push('due_date has an invalid year. Please check your date mapping.');
      }
      if (cleanedPayload.issue_date && cleanedPayload.issue_date.match(/^0\d{3}-\d{2}-\d{2}$/)) {
        validationErrors.push('issue_date has an invalid year. Please check your date mapping.');
      }
      
      // Check for string values in numeric fields
      if (cleanedPayload.tax_total && Array.isArray(cleanedPayload.tax_total)) {
        cleanedPayload.tax_total.forEach((tax: any, idx: number) => {
          if (tax.tax_subtotal && Array.isArray(tax.tax_subtotal)) {
            tax.tax_subtotal.forEach((subtotal: any, subIdx: number) => {
              if (typeof subtotal.taxable_amount === 'string' && subtotal.taxable_amount.includes('NGN')) {
                validationErrors.push(`tax_total[${idx}].tax_subtotal[${subIdx}].taxable_amount appears to be a currency string. Please map it to a numeric amount column.`);
              }
            });
          }
        });
      }
      if (cleanedPayload.legal_monetary_total) {
        if (typeof cleanedPayload.legal_monetary_total.tax_exclusive_amount === 'string' && cleanedPayload.legal_monetary_total.tax_exclusive_amount.includes('NGN')) {
          validationErrors.push('legal_monetary_total.tax_exclusive_amount appears to be a currency string. Please map it to a numeric amount column.');
        }
      }
      
      // If there are validation errors, show them but don't block upload (let API validate)
      if (validationErrors.length > 0) {
        console.warn('⚠️ Field mapping validation warnings:', validationErrors);
        // Show a warning toast but continue with upload
        addToast({
          variant: "warning",
          title: "Field Mapping Warnings",
          description: `Some fields appear to be mapped incorrectly. ${validationErrors.length} issue(s) detected. Please review your field mappings.`,
        });
      }
      
      // Final check: Ensure invoice_line items have all required fields
      if (cleanedPayload.invoice_line && Array.isArray(cleanedPayload.invoice_line) && cleanedPayload.invoice_line.length > 0) {
        cleanedPayload.invoice_line = cleanedPayload.invoice_line.map((line: any) => {
          // Ensure nested structures exist
          if (!line.item) line.item = {};
          if (!line.price) line.price = {};
          
          // CRITICAL: Always set required fields (API requires them)
          line.hsn_code = line.hsn_code !== undefined && line.hsn_code !== null ? String(line.hsn_code).trim() : '';
          line.invoiced_quantity = line.invoiced_quantity !== undefined && line.invoiced_quantity !== null 
            ? (typeof line.invoiced_quantity === 'number' ? line.invoiced_quantity : Number(line.invoiced_quantity) || 0)
            : 0;
          line.item.name = line.item.name !== undefined && line.item.name !== null ? String(line.item.name).trim() : '';
          line.product_category = line.product_category !== undefined && line.product_category !== null 
            ? String(line.product_category).trim() : '';
          
          // Ensure price structure
          if (!line.price.price_amount) line.price.price_amount = 0;
          if (!line.price.price_unit) line.price.price_unit = 'NGN per 1';
          if (!line.price.base_quantity) line.price.base_quantity = 1;
          if (line.line_extension_amount === undefined) line.line_extension_amount = 0;
          
          return line;
        });
        
        // Debug log to verify required fields are present
        console.log('📦 Final invoice_line structure:', JSON.stringify(cleanedPayload.invoice_line, null, 2));
      }
      
      // Validate JSON can be stringified
      let jsonString: string;
      try {
        jsonString = JSON.stringify(cleanedPayload);
        // Validate JSON is valid
        JSON.parse(jsonString);
      } catch (jsonError) {
        console.error('❌ Invalid JSON payload:', jsonError);
        setUploading(false);
        setUploadStatus('error');
        setErrorMessage(`Failed to create valid JSON payload. Please check your data. Error: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
        return;
      }
      
      const { API_END_POINT } = await import('@/app/config/Api');
      
      // Send the payload - API expects single invoice object (not array)
      const response = await fetch(API_END_POINT.INVOICE.UPLOAD_INVOICE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: jsonString
      });
      
      // Get response text
      const responseText = await response.text();

      if (!response.ok) {
        // Try to parse error response
        let errorData: any;
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          // If parsing fails, use raw text
          errorData = { message: responseText, status_code: response.status };
        }
        
        // Handle "Failed to parse request body" error
        if (errorData.message === 'Failed to parse request body' || response.status === 400) {
          console.error('❌ JSON Parsing Error - Payload structure issue');
          console.error('Error details:', errorData);
          console.error('Payload that failed:', JSON.stringify(cleanedPayload, null, 2));
          
          // Try to identify the problematic field based on offset
          if (errorData.error?.Offset) {
            const offset = errorData.error.Offset;
            const jsonStringForOffset = JSON.stringify(cleanedPayload);
            const problematicSection = jsonStringForOffset.substring(Math.max(0, offset - 50), offset + 50);
            console.error('Problematic section around offset', offset, ':', problematicSection);
          }
          
          setUploading(false);
          setUploadStatus('error');
          setErrorMessage(
            `Failed to parse request body. The payload contains invalid data. ` +
            `Please check your Excel data for invalid values (NaN, invalid dates, etc.). ` +
            `Error: ${errorData.message || 'Invalid JSON structure'}`
          );
          // Refresh invoices table even on failure (some rows may have been processed)
          onUploadSuccess();
          return;
        }
      }

      if (response.ok) {
        setUploadStatus('success');
        
        // Show success toast
        addToast({
          variant: "success",
          title: "Upload Successful",
          description: "Invoice(s) uploaded successfully!",
        });
        
        onUploadSuccess();
        
        // Clear file state on successful upload
        clearFileState();
        
        // Close dialog after success
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        // Try to parse error response with detailed error information
        let errorMessage = 'Upload failed. Please try again.';
        let errorDetails: string[] = [];
        
        try {
          const errorData = JSON.parse(responseText);
          
          // Handle different error response formats
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
          
          // Handle structured error format (Field, Struct, Value, Type)
          if (errorData.error && typeof errorData.error === 'object' && errorData.error.Field) {
            const fieldError = errorData.error;
            const struct = fieldError.Struct || '';
            const field = fieldError.Field || '';
            const value = fieldError.Value || '';
            const type = fieldError.Type || '';
            
            // Build user-friendly error message
            let fieldPath = struct ? `${struct}.${field}` : field;
            let fieldErrorMsg = `Field: ${fieldPath}`;
            
            if (value) {
              fieldErrorMsg += `\nValue: ${value}`;
            }
            if (type && typeof type === 'object' && Object.keys(type).length > 0) {
              fieldErrorMsg += `\nExpected Type: ${JSON.stringify(type)}`;
            } else if (type) {
              fieldErrorMsg += `\nExpected Type: ${type}`;
            }
            
            errorDetails.push(fieldErrorMsg);
          }
          
          // Extract detailed error information
          if (errorData.errors) {
            if (Array.isArray(errorData.errors)) {
              errorDetails = [...errorDetails, ...errorData.errors];
            } else if (typeof errorData.errors === 'object') {
              // Handle object with field-specific errors
              const fieldErrors = Object.entries(errorData.errors).map(([field, message]) => {
                if (Array.isArray(message)) {
                  return `${field}: ${message.join(', ')}`;
                }
                return `${field}: ${message}`;
              });
              errorDetails = [...errorDetails, ...fieldErrors];
            }
          }
          
          // Handle validation errors - check for missing fields
          let hasMissingFields = false;
          const missingFieldLabels: string[] = [];
          const missingFieldPaths: string[] = []; // Store normalized field paths for mapping dialog
          
          if (errorData.error && typeof errorData.error === 'object' && !errorData.error.Field) {
            // This is likely a validation error object with field paths
            const validationErrors = errorData.error;
            
            // Helper function to normalize API field names to our internal format
            const normalizeFieldName = (fieldPath: string): string => {
              let normalized = fieldPath;
              
              // Convert lowercase variations to snake_case
              // Handle array notation variations
              normalized = normalized.replace(/invoiceline\[/gi, 'invoice_line[');
              normalized = normalized.replace(/taxtotal\[/gi, 'tax_total[');
              normalized = normalized.replace(/taxsubtotal\[/gi, 'tax_subtotal[');
              
              // Convert camelCase/concatenated to snake_case
              normalized = normalized.replace(/lineextensionamount/gi, 'line_extension_amount');
              normalized = normalized.replace(/priceamount/gi, 'price_amount');
              normalized = normalized.replace(/taxamount/gi, 'tax_amount');
              normalized = normalized.replace(/taxableamount/gi, 'taxable_amount');
              normalized = normalized.replace(/taxexclusiveamount/gi, 'tax_exclusive_amount');
              normalized = normalized.replace(/taxinclusiveamount/gi, 'tax_inclusive_amount');
              normalized = normalized.replace(/payableamount/gi, 'payable_amount');
              normalized = normalized.replace(/invoicedquantity/gi, 'invoiced_quantity');
              normalized = normalized.replace(/basequantity/gi, 'base_quantity');
              normalized = normalized.replace(/priceunit/gi, 'price_unit');
              normalized = normalized.replace(/hsncode/gi, 'hsn_code');
              normalized = normalized.replace(/productcategory/gi, 'product_category');
              normalized = normalized.replace(/partyname/gi, 'party_name');
              normalized = normalized.replace(/cityname/gi, 'city_name');
              normalized = normalized.replace(/streetname/gi, 'street_name');
              normalized = normalized.replace(/postalzone/gi, 'postal_zone');
              normalized = normalized.replace(/taxcategory/gi, 'tax_category');
              
              // Handle item.name (already in correct format, but ensure it's preserved)
              // The backend sends "invoiceline[0].item.name" which becomes "invoice_line[0].item.name"
              // No conversion needed for "item.name" as it's already in the correct format
              
              // Handle nested paths
              normalized = normalized.replace(/tax_total\[(\d+)\]\.tax_amount/g, 'tax_total[$1].tax_amount');
              normalized = normalized.replace(/tax_total\[(\d+)\]\.tax_subtotal\[(\d+)\]\.taxable_amount/g, 'tax_total[$1].tax_subtotal[$2].taxable_amount');
              normalized = normalized.replace(/tax_total\[(\d+)\]\.tax_subtotal\[(\d+)\]\.tax_amount/g, 'tax_total[$1].tax_subtotal[$2].tax_amount');
              normalized = normalized.replace(/invoice_line\[(\d+)\]\.price\.price_amount/g, 'invoice_line[$1].price.price_amount');
              
              return normalized;
            };
            
            // Map API field names to user-friendly labels
            const fieldNameMap: Record<string, string> = {
              'accounting_customer_party.postal_address.lga': 'Customer LGA',
              'accounting_customer_party.postal_address.postal_zone': 'Customer Postal Zone',
              'accounting_customer_party.postal_address.state': 'Customer State',
              'accounting_customer_party.postal_address.city_name': 'Customer City',
              'accounting_customer_party.postal_address.street_name': 'Customer Street',
              'accounting_customer_party.postal_address.country': 'Customer Country',
              'accounting_customer_party.email': 'Customer Email',
              'accounting_customer_party.party_name': 'Customer Name',
              'accounting_customer_party.tin': 'Customer TIN',
              'accounting_supplier_party.postal_address.lga': 'Supplier LGA',
              'accounting_supplier_party.postal_address.postal_zone': 'Supplier Postal Zone',
              'accounting_supplier_party.postal_address.state': 'Supplier State',
              'accounting_supplier_party.postal_address.city_name': 'Supplier City',
              'accounting_supplier_party.postal_address.street_name': 'Supplier Street',
              'accounting_supplier_party.postal_address.country': 'Supplier Country',
              'accounting_supplier_party.email': 'Supplier Email',
              'accounting_supplier_party.party_name': 'Supplier Name',
              'accounting_supplier_party.tin': 'Supplier TIN',
              'legal_monetary_total.line_extension_amount': 'Line Extension Amount',
              'legal_monetary_total.tax_exclusive_amount': 'Tax Exclusive Amount',
              'legal_monetary_total.tax_inclusive_amount': 'Tax Inclusive Amount',
              'legal_monetary_total.payable_amount': 'Payable Amount',
              'tax_total[].tax_amount': 'Tax Amount',
              'tax_total[].tax_subtotal[].taxable_amount': 'Taxable Amount',
              'tax_total[].tax_subtotal[].tax_amount': 'Tax Subtotal Amount',
              'invoice_line[].line_extension_amount': 'Line Extension Amount',
              'invoice_line[].price.price_amount': 'Price Amount',
              'invoice_line[].hsn_code': 'HSN Code',
              'invoice_line[].invoiced_quantity': 'Invoiced Quantity',
              'invoice_line[].item.name': 'Item Name',
              'invoice_line[].product_category': 'Product Category',
            };
            
            // Extract field names from error object
            Object.keys(validationErrors).forEach((fieldPath) => {
              // Check if this is a "this field is required" error
              const errorMsg = validationErrors[fieldPath];
              if (typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('required')) {
                hasMissingFields = true;
                
                // Normalize API field names to our format
                const normalizedField = normalizeFieldName(fieldPath);
                
                // Remove array indices for lookup (e.g., invoice_line[0] -> invoice_line[])
                const displayPath = normalizedField.replace(/\[\d+\]/g, '[]');
                
                // Get user-friendly label
                let fieldLabel = fieldNameMap[displayPath] || fieldNameMap[normalizedField] || fieldNameMap[fieldPath];
                
                // If no direct match, try to create a readable label from the field path
                if (!fieldLabel) {
                  // Convert snake_case to Title Case and replace dots with arrows
                  fieldLabel = displayPath
                    .replace(/\[\]/g, '')
                    .replace(/_/g, ' ')
                    .replace(/\./g, ' > ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                }
                
                missingFieldLabels.push(fieldLabel);
                // Store normalized field path for mapping dialog (remove array indices)
                const fieldPathForMapping = displayPath;
                if (!missingFieldPaths.includes(fieldPathForMapping)) {
                  missingFieldPaths.push(fieldPathForMapping);
                }
                
                // Debug: Log the normalization process
                console.log('API Error Field Normalization:', {
                  original: fieldPath,
                  normalized: normalizedField,
                  displayPath: displayPath,
                  fieldLabel: fieldLabel
                });
              }
              
              // Add to error details with normalized field name
              const normalizedField = normalizeFieldName(fieldPath);
              // Remove array indices for cleaner display
              const displayField = normalizedField.replace(/\[\d+\]/g, '[]');
              errorDetails.push(`${displayField}: ${errorMsg}`);
            });
            
            // Store missing required fields in state for mapping dialog
            if (missingFieldPaths.length > 0) {
              console.log('Setting missing required fields for mapping dialog:', missingFieldPaths);
              setMissingRequiredFields(missingFieldPaths);
            } else {
              setMissingRequiredFields([]);
            }
          } else {
            // Clear missing fields if no validation errors
            setMissingRequiredFields([]);
          }
          
          if (errorData.validation_errors) {
            if (Array.isArray(errorData.validation_errors)) {
              errorDetails = [...errorDetails, ...errorData.validation_errors];
            } else if (typeof errorData.validation_errors === 'object') {
              errorDetails = [...errorDetails, ...Object.entries(errorData.validation_errors).map(([field, message]) => {
                if (Array.isArray(message)) {
                  return `${field}: ${message.join(', ')}`;
                }
                return `${field}: ${message}`;
              })];
            }
          }
          
          // Update error message if we found missing fields
          if (hasMissingFields && missingFieldLabels.length > 0) {
            errorMessage = `Missing required fields: ${missingFieldLabels.join(', ')}. Please map these fields using the "Map Headers" button below.`;
            // The missingRequiredFields state is already set above, which will trigger the Field Mapping Panel
          }
          
          // Handle data field errors (nested structure)
          if (errorData.data && typeof errorData.data === 'object') {
            if (errorData.data.message) {
              errorMessage = errorData.data.message;
            }
            if (errorData.data.errors) {
              if (Array.isArray(errorData.data.errors)) {
                errorDetails = [...errorDetails, ...errorData.data.errors];
              } else if (typeof errorData.data.errors === 'object') {
                errorDetails = [...errorDetails, ...Object.entries(errorData.data.errors).map(([field, message]) => {
                  if (Array.isArray(message)) {
                    return `${field}: ${message.join(', ')}`;
                  }
                  return `${field}: ${message}`;
                })];
              }
            }
          }
          
        } catch (e) {
          // If response is not JSON, use the raw text
          errorMessage = responseText || `Server returned error: ${response.status} ${response.statusText}`;
        }
        
        // Combine error message with details in a structured format
        let fullErrorMessage = errorMessage;
        if (errorDetails.length > 0) {
          fullErrorMessage = `${errorMessage}\n\nDetails:\n${errorDetails.join('\n')}`;
        }
        
        setUploadStatus('error');
        setErrorMessage(fullErrorMessage);
        
        // Show error toast with main message
        addToast({
          variant: "error",
          title: "Upload Failed",
          description: errorMessage || "Failed to upload invoice. Please check the error details below.",
        });
        
        // Also log to console for debugging
        console.error('Upload failed:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorDetails,
          responseText
        });
        
        // Refresh invoices table even on failure (some rows may have been processed)
        onUploadSuccess();
      }
    } catch (error) {
      setUploadStatus('error');
      const errorMsg = error instanceof Error 
        ? `Network error: ${error.message}. Please check your connection and try again.`
        : 'Network error. Please check your connection and try again.';
      setErrorMessage(errorMsg);
      
      // Show error toast
      addToast({
        variant: "error",
        title: "Network Error",
        description: errorMsg,
      });
      
      // Log error for debugging
      console.error('Upload error:', error);
      
      // Refresh invoices table even on failure (in case server processed anything before error)
      onUploadSuccess();
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
            // Light modal surface (avoid inheriting the global purple background)
            'bg-white text-slate-900 border-slate-200 max-h-[95vh] overflow-y-auto transition-all duration-300 m-2 sm:m-4 shadow-2xl'
          )}
        >
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Upload Invoice Excel</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-600">
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
            <div className="flex flex-col items-start py-6 space-y-3 w-full">
              <div className="flex items-start gap-3 w-full">
                <AlertCircle className="size-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-red-900">Upload Failed</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                    {errorMessage && (() => {
                      const mainMessage = errorMessage.split('\n\nDetails:')[0] || errorMessage;
                      const hasMissingFields = errorMessage.includes('Missing required fields');
                      
                      // Extract missing field names from the message
                      const missingFieldsMatch = mainMessage.match(/Missing required fields: ([^.]+)/);
                      const missingFieldsList = missingFieldsMatch 
                        ? missingFieldsMatch[1].split(',').map(f => f.trim())
                        : [];
                      
                      return (
                        <div>
                          <p className="text-sm font-medium text-red-900 mb-3">
                            {mainMessage}
                          </p>
                          
                          {/* Highlight missing fields in a more visual way */}
                          {hasMissingFields && missingFieldsList.length > 0 && (
                            <div className="bg-white rounded-lg p-3 border border-red-300 mb-3">
                              <p className="text-xs font-semibold text-red-800 mb-2 uppercase tracking-wide">
                                Missing Fields to Map:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {missingFieldsList.map((field, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-100 text-red-800 text-xs font-medium border border-red-300"
                                  >
                                    <AlertCircle className="size-3" />
                                    {field}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-red-700 mt-3 italic">
                                💡 Click "Map Headers" below to assign these fields to your Excel columns
                              </p>
                            </div>
                          )}
                          
                          {errorMessage.includes('\n\nDetails:') && (
                            <div className="mt-3 pt-3 border-t border-red-200">
                              <p className="text-xs font-semibold text-red-800 mb-2 uppercase tracking-wide">
                                Field Error Details:
                              </p>
                              <div className="space-y-2">
                                {errorMessage.split('\n\nDetails:')[1]?.split('\n').filter(line => line.trim()).map((detail, idx) => {
                                  // Check if this is a field error (starts with "Field:")
                                  if (detail.startsWith('Field:')) {
                                    const lines = detail.split('\n');
                                    return (
                                      <div key={idx} className="bg-white rounded p-3 border border-red-300 shadow-sm">
                                        {lines.map((line, lineIdx) => {
                                          if (line.startsWith('Field:')) {
                                            return (
                                              <p key={lineIdx} className="text-xs font-semibold text-red-900 mb-1">
                                                🔴 {line.replace('Field:', '').trim()}
                                              </p>
                                            );
                                          } else if (line.startsWith('Value:')) {
                                            return (
                                              <p key={lineIdx} className="text-xs text-red-700 ml-4">
                                                Value: <code className="bg-red-50 px-1 rounded">{line.replace('Value:', '').trim()}</code>
                                              </p>
                                            );
                                          } else if (line.startsWith('Expected Type:')) {
                                            return (
                                              <p key={lineIdx} className="text-xs text-red-700 ml-4">
                                                Expected: <code className="bg-red-50 px-1 rounded">{line.replace('Expected Type:', '').trim()}</code>
                                              </p>
                                            );
                                          }
                                          return (
                                            <p key={lineIdx} className="text-xs text-red-700 ml-4">
                                              {line}
                                            </p>
                                          );
                                        })}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={idx} className="bg-white rounded p-2 border border-red-200">
                                      <p className="text-xs text-red-800 whitespace-pre-wrap break-words">
                                        {detail}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {!errorMessage && (
                      <p className="text-sm text-red-800">Upload failed. Please try again.</p>
                    )}
                  </div>
                  
                  {/* Dynamic Field Mapping Panel - Shows missing required fields from API errors */}
                  {missingRequiredFields.length > 0 && (
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">
                            Field Mapping Required
                          </h4>
                          <p className="text-xs text-blue-800 mb-3">
                            The following required fields are missing. Select an Excel header, then click on a field below to map them:
                          </p>
                          
                          {/* Missing Fields List */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {missingRequiredFields.map((fieldPath, idx) => {
                              // Find the field in INVOICE_FIELDS to get a user-friendly label
                              const field = INVOICE_FIELDS.find(f => {
                                const normalizedField = f.value.replace(/\[\d*\]/g, '[]');
                                const normalizedPath = fieldPath.replace(/\[\d*\]/g, '[]');
                                return normalizedField === normalizedPath || 
                                       f.value === fieldPath ||
                                       fieldPath.includes(f.value.replace(/\[\]/g, ''));
                              });
                              
                              const fieldLabel = field 
                                ? field.label 
                                : fieldPath
                                    .replace(/\[\]/g, '')
                                    .replace(/_/g, ' ')
                                    .replace(/\./g, ' > ')
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');
                              
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300"
                                >
                                  <AlertCircle className="size-3 text-blue-600" />
                                  {fieldLabel}
                                </span>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              // If headers are missing, try to restore from saved state
                              if (header.length === 0) {
                                const savedState = getSavedFileState();
                                if (savedState && savedState.headers && savedState.headers.length > 0) {
                                  setHeader(savedState.headers);
                                  setPreview(true);
                                  setIsRestoredState(true);
                                  addToast({
                                    variant: "info",
                                    title: "Headers Restored",
                                    description: "Headers have been restored from your previous session.",
                                  });
                                } else {
                                  // No headers available - user needs to upload file first
                                  addToast({
                                    variant: "error",
                                    title: "No Headers Available",
                                    description: "Please upload your Excel file again to see the headers for mapping. The file will be re-read to extract headers.",
                                  });
                                  return; // Don't open mapping dialog if no headers
                                }
                              }
                              setShowMappingDialog(true);
                            }}
                            className="bg-secondary hover:bg-secondary/90 text-white font-medium"
                          >
                            <Map className="size-4 mr-2" />
                            Map Headers
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {errorMessage && errorMessage.includes('Missing required fields') && missingRequiredFields.length === 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // If headers are missing, try to restore from saved state
                          if (header.length === 0) {
                            const savedState = getSavedFileState();
                            if (savedState && savedState.headers && savedState.headers.length > 0) {
                              setHeader(savedState.headers);
                              setPreview(true);
                              setIsRestoredState(true);
                              addToast({
                                variant: "info",
                                title: "Headers Restored",
                                description: "Headers have been restored from your previous session.",
                              });
                            } else {
                              // No headers available - user needs to upload file first
                              addToast({
                                variant: "error",
                                title: "No Headers Available",
                                description: "Please upload your Excel file again to see the headers for mapping. The file will be re-read to extract headers.",
                              });
                              return; // Don't open mapping dialog if no headers
                            }
                          }
                          setShowMappingDialog(true);
                        }}
                        className="bg-secondary hover:bg-secondary/90 text-white font-medium"
                      >
                        <Map className="size-4 mr-2" />
                        Map Headers
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUploadStatus('idle');
                        setErrorMessage('');
                      }}
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Error message when mapping is required */}
              {errorMessage && !uploading && uploadStatus === 'idle' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-amber-900">
                      {errorMessage}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Please map the required fields using the "Map Headers" button below.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Period Number Input - Commented out */}
              {/* <div className="space-y-2">
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
              </div> */}

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 sm:p-8 text-center bg-slate-50 hover:border-secondary hover:bg-secondary/5 transition-colors">
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
                  <FileSpreadsheet className="size-8 sm:size-12 text-secondary" />
                  <span className="text-sm sm:text-base font-medium text-slate-800 break-words max-w-full px-2">
                    {file ? file.name : 'Click to select Excel file'}
                  </span>
                  <span className="text-xs text-slate-600">
                    Supports .xlsx and .xls files
                  </span>
                </label>
              </div>

              {/* Headers Preview Section */}
              {preview && header.length > 0 && (() => {
                const mappings = getSavedMappings();
                const mappedCount = header.filter(h => mappings[h] && mappings[h] !== 'skip').length;
                const requiredFields = INVOICE_FIELDS.filter((f: InvoiceField) => f.required);
                const requiredMappedCount = requiredFields.filter((f: InvoiceField) => 
                  Object.values(mappings).includes(f.value)
                ).length;
                
                return (
                  <Card className="p-3 sm:p-6 w-full">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900">
                            Excel Headers ({header.length} columns)
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              {mappedCount} mapped
                            </span>
                            {/* Intentionally hide \"required fields missing\" here.
                                We now allow uploads without mapping first and only
                                show missing field information after the API
                                returns validation errors. */}
                          </div>
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
                          {header.map((headerName, index) => {
                            const isMapped = mappings[headerName] && mappings[headerName] !== 'skip';
                            const mappedField = isMapped ? INVOICE_FIELDS.find((f: InvoiceField) => f.value === mappings[headerName]) : null;
                            const isRequired = mappedField?.required || false;
                            
                            return (
                              <li
                                key={index}
                                className={cn(
                                  "flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded border transition-colors",
                                  isMapped 
                                    ? "bg-green-50 border-green-200 hover:bg-green-100" 
                                    : "bg-white border-slate-200 hover:bg-slate-100",
                                  isRequired && isMapped && "border-green-300"
                                )}
                              >
                                <span className="text-xs font-mono text-slate-500 w-5 sm:w-6 flex-shrink-0">
                                  {index + 1}
                                </span>
                                <span className="text-xs sm:text-sm text-slate-900 flex-1 break-words">
                                  {headerName}
                                </span>
                                {isMapped && (
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    <CheckCircle2 className={cn(
                                      "size-4",
                                      isRequired ? "text-green-600" : "text-green-500"
                                    )} />
                                    {mappedField && (
                                      <span className="text-xs text-slate-600 hidden sm:inline max-w-[150px] truncate">
                                        → {mappedField.label}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                      <p className="text-xs text-slate-500">
                        {mappedCount === 0 
                          ? 'Click "Map Headers" to map these Excel headers to invoice data structure fields.'
                          : `${mappedCount} header${mappedCount !== 1 ? 's' : ''} ${mappedCount === 1 ? 'is' : 'are'} mapped. ${requiredMappedCount < requiredFields.length ? 'Please map all required fields before uploading.' : 'All required fields are mapped. You can proceed with upload.'}`
                        }
                      </p>
                    </div>
                  </Card>
                );
              })()}

              {!preview && (
                <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900">Expected Excel Format</h4>
                    <a
                      className="text-xs font-medium text-secondary hover:underline inline-flex items-center gap-1"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        addToast({
                          variant: "info",
                          title: "Template not available yet",
                          description: "We’ll add a downloadable sample template soon.",
                        });
                      }}
                    >
                      <Download className="size-3" />
                      Download sample
                    </a>
                  </div>
                  <ul className="mt-2 text-xs text-slate-700 space-y-1 list-disc pl-5">
                    <li>Invoice Number</li>
                    <li>Recipient Name</li>
                    <li>Recipient TIN</li>
                    <li>Amount</li>
                    <li>Date</li>
                    <li>Due Date</li>
                  </ul>
                </div>
              )}


              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button
                  variant="ghost"
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
      missingRequiredFields={missingRequiredFields}
    />
    </>
  );
}

