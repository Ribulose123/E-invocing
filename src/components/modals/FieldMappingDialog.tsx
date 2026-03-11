'use client'
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Search, Filter, ArrowUpDown, Info, X } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import {
  INVOICE_FIELDS,
  type InvoiceField,
  calculateProgress,
  filterHeaders,
  sortHeaders,
  filterInvoiceFields,
  groupFieldsByCategory,
  getFieldDescription,
  getUnmappedRequiredFields,
  validateRequiredMappings,
  isMappedToRequired,
} from '../utils/fieldMappingUtils';

export interface FieldMapping {
  [userHeader: string]: string; // maps user header to invoice field path
}

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userHeaders: string[];
  existingMappings?: FieldMapping;
  onSave: (mappings: FieldMapping) => void;
  onAutoSave?: (mappings: FieldMapping) => void; // Optional callback for auto-saving without closing dialog
  missingRequiredFields?: string[]; // Fields that are missing from API errors (e.g., ['invoice_line[].hsn_code', 'invoice_line[].item.name'])
}

// Re-export INVOICE_FIELDS for backward compatibility
export { INVOICE_FIELDS };

export function FieldMappingDialog({
  open,
  onOpenChange,
  userHeaders,
  existingMappings = {},
  onSave,
  onAutoSave,
  missingRequiredFields = [],
}: FieldMappingDialogProps) {
  const [mappings, setMappings] = useState<FieldMapping>(existingMappings);
  const [headerSearch, setHeaderSearch] = useState<string>('');
  const [debouncedHeaderSearch, setDebouncedHeaderSearch] = useState<string>('');
  const [fieldSearch, setFieldSearch] = useState<string>('');
  const [debouncedFieldSearch, setDebouncedFieldSearch] = useState<string>('');
  const [selectedHeader, setSelectedHeader] = useState<string | null>(null);
  const [headerFilter, setHeaderFilter] = useState<'all' | 'mapped' | 'unmapped' | 'required'>('all');
  const [headerSort, setHeaderSort] = useState<'original' | 'alphabetical' | 'mapped-first' | 'unmapped-first'>('unmapped-first');

  useEffect(() => {
    setMappings(existingMappings);
  }, [existingMappings]);

  // Debounce header search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedHeaderSearch(headerSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [headerSearch]);

  // Debounce field search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFieldSearch(fieldSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [fieldSearch]);

  // Auto-save mappings whenever they change (debounced) - saves to localStorage
  useEffect(() => {
    // Only auto-save if mappings have actually changed from initial state
    // Skip initial render to avoid saving immediately when dialog opens
    const hasChanges = JSON.stringify(mappings) !== JSON.stringify(existingMappings);
    
    if (hasChanges && (Object.keys(mappings).length > 0 || Object.keys(existingMappings).length > 0)) {
      const timeoutId = setTimeout(() => {
        // Save to localStorage directly
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('invoiceFieldMappings', JSON.stringify(mappings));
          } catch (error) {
            console.error('Failed to auto-save mappings to localStorage:', error);
          }
        }
        
        // Also call onAutoSave callback if provided
        if (onAutoSave) {
          onAutoSave(mappings);
        }
      }, 1000); // Debounce: save 1 second after last change

      return () => clearTimeout(timeoutId);
    }
  }, [mappings, existingMappings, onAutoSave]);

  // Memoize progress calculation
  const progress = useMemo(
    () => calculateProgress(userHeaders, mappings),
    [userHeaders, mappings]
  );
  
  // Auto-map suggestions removed (manual mapping only).

  // Memoize mapped fields to avoid recalculation in loops
  const mappedFields = useMemo(
    () => Object.values(mappings).filter((v) => v && v !== 'skip'),
    [mappings]
  );

  // Memoize unmapped required fields to avoid recalculation
  const unmappedRequiredFields = useMemo(
    () => getUnmappedRequiredFields(mappings),
    [mappings]
  );

  const handleMappingChange = useCallback((userHeader: string, invoiceField: string) => {
    setMappings((prev) => ({
      ...prev,
      [userHeader]: invoiceField,
    }));
    // Clear selection after mapping
    setSelectedHeader(null);
  }, []);

  const handleHeaderClick = useCallback((userHeader: string) => {
    // If clicking the same header, deselect it
    if (selectedHeader === userHeader) {
      setSelectedHeader(null);
    } else {
      setSelectedHeader(userHeader);
    }
  }, [selectedHeader]);

  const handleUnmapField = useCallback((fieldValue: string) => {
    setMappings((prev) => {
      const newMappings = { ...prev };
      // Find the header that maps to this field and remove it
      const headerToUnmap = Object.keys(newMappings).find(
        (h) => newMappings[h] === fieldValue
      );
      if (headerToUnmap) {
        delete newMappings[headerToUnmap];
      }
      return newMappings;
    });
  }, []);

  const handleFieldClick = useCallback((fieldValue: string) => {
    if (selectedHeader) {
      handleMappingChange(selectedHeader, fieldValue);
    } else {
      // If no header is selected but field is clicked and it's already mapped, unmap it
      const mappedHeader = Object.keys(mappings).find(
        (h) => mappings[h] === fieldValue
      );
      if (mappedHeader) {
        handleUnmapField(fieldValue);
      }
    }
  }, [selectedHeader, handleMappingChange, mappings, handleUnmapField]);

  const handleSkip = useCallback((userHeader: string) => {
    setMappings((prev) => {
      const newMappings = { ...prev };
      delete newMappings[userHeader];
      return newMappings;
    });
  }, []);

  const handleUnmap = useCallback((userHeader: string) => {
    setMappings((prev) => {
      const newMappings = { ...prev };
      delete newMappings[userHeader];
      return newMappings;
    });
    // Clear selection if the unmapped header was selected
    if (selectedHeader === userHeader) {
      setSelectedHeader(null);
    }
  }, [selectedHeader]);

  // Auto-map suggestions removed (manual mapping only).

  const handleSave = useCallback(() => {
    onSave(mappings);
    // Also save to localStorage directly
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('invoiceFieldMappings', JSON.stringify(mappings));
      } catch (error) {
        console.error('Failed to save mappings to localStorage:', error);
      }
    }
    onOpenChange(false);
  }, [mappings, onSave, onOpenChange]);

  // Save to localStorage when dialog closes (even without clicking Save)
  useEffect(() => {
    return () => {
      // This cleanup function runs when the component unmounts (dialog closes)
      if (typeof window !== 'undefined' && Object.keys(mappings).length > 0) {
        try {
          localStorage.setItem('invoiceFieldMappings', JSON.stringify(mappings));
        } catch (error) {
          console.error('Failed to auto-save mappings to localStorage:', error);
        }
      }
    };
  }, [mappings]);

  const isHeaderMapped = useCallback((userHeader: string) => {
    return !!(mappings[userHeader] && mappings[userHeader] !== 'skip');
  }, [mappings]);

  const canSave = useMemo(() => {
    return validateRequiredMappings(mappings);
  }, [mappings]);

  // Memoize filtered and sorted headers
  const filteredHeaders = useMemo(
    () => filterHeaders(userHeaders, debouncedHeaderSearch, mappings, headerFilter),
    [userHeaders, debouncedHeaderSearch, mappings, headerFilter]
  );
  
  const sortedHeaders = useMemo(
    () => sortHeaders(filteredHeaders, mappings, headerSort, userHeaders),
    [filteredHeaders, mappings, headerSort, userHeaders]
  );

  // Helper function to find a field in INVOICE_FIELDS by path or label
  const findFieldByPathOrLabel = useCallback((searchPath: string): InvoiceField | null => {
    // First try exact value match
    let field = INVOICE_FIELDS.find(f => f.value === searchPath);
    if (field) return field;
    
    // Normalize the search path
    const normalizedSearch = searchPath.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
    
    // Try to find by normalized value
    field = INVOICE_FIELDS.find(f => {
      const normalizedField = f.value.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
      return normalizedSearch === normalizedField || 
             f.value.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedField);
    });
    if (field) return field;
    
    // Try to find by label (case-insensitive, remove spaces/special chars)
    const searchLabel = normalizedSearch.replace(/_/g, ' ').replace(/\./g, ' ').toLowerCase();
    field = INVOICE_FIELDS.find(f => {
      const fieldLabel = f.label.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      return fieldLabel.includes(searchLabel) || searchLabel.includes(fieldLabel.replace(/\s+/g, ''));
    });
    if (field) return field;
    
    // Try partial matching on the last part of the path (e.g., "invoiced_quantity" from "invoice_line[].invoiced_quantity")
    const lastPart = normalizedSearch.split('.').pop() || normalizedSearch.split('[]').pop() || '';
    if (lastPart) {
      field = INVOICE_FIELDS.find(f => {
        const fieldLastPart = f.value.split('.').pop() || f.value.split('[]').pop() || '';
        return fieldLastPart.toLowerCase() === lastPart.toLowerCase() ||
               fieldLastPart.toLowerCase().includes(lastPart.toLowerCase()) ||
               lastPart.toLowerCase().includes(fieldLastPart.toLowerCase());
      });
      if (field) return field;
    }
    
    return null;
  }, []);

  // Helper function to check if a field matches a missing field path
  const isFieldMissing = useCallback((fieldValue: string, missingPaths: string[]): boolean => {
    if (missingPaths.length === 0) return false;
    return missingPaths.some(mf => {
      // Exact match
      if (mf === fieldValue) return true;
      
      // Remove array brackets for comparison
      const normalizedMissing = mf.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
      const normalizedField = fieldValue.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
      
      // Check if they match after normalization
      if (normalizedMissing === normalizedField) return true;
      
      // Check if field value contains the missing field (for nested paths like item.name)
      if (fieldValue.includes(normalizedMissing) || normalizedMissing.includes(normalizedField)) {
        return true;
      }
      
      // Handle special case: invoice_line[].item.name should match invoice_line[].item.name
      if (mf.includes('item.name') && fieldValue.includes('item.name')) {
        return true;
      }
      
      // Try to find the field using the improved search
      const foundField = findFieldByPathOrLabel(mf);
      if (foundField && foundField.value === fieldValue) {
        return true;
      }
      
      return false;
    });
  }, [findFieldByPathOrLabel]);

  // Get all required fields, plus any missing API fields (even if not marked as required)
  const requiredFields = useMemo(() => {
    const standardRequired = INVOICE_FIELDS.filter(field => field.required);
    
    // If there are missing API fields, include them even if not marked as required
    if (missingRequiredFields.length > 0) {
      // First, try to find fields that match the missing paths
      const missingFieldsFromAPI: InvoiceField[] = [];
      
      missingRequiredFields.forEach(missingPath => {
        // Try to find the field using improved search
        const foundField = findFieldByPathOrLabel(missingPath);
        if (foundField && !foundField.required) {
          // Only add if not already in the list
          if (!missingFieldsFromAPI.find(f => f.value === foundField.value)) {
            missingFieldsFromAPI.push(foundField);
          }
        } else if (!foundField) {
          // If field not found, try to find by matching existing fields
          const matchedFields = INVOICE_FIELDS.filter(field => 
            isFieldMissing(field.value, [missingPath]) && !field.required
          );
          matchedFields.forEach(field => {
            if (!missingFieldsFromAPI.find(f => f.value === field.value)) {
              missingFieldsFromAPI.push(field);
            }
          });
        }
      });
      
      // Combine required fields with missing API fields, avoiding duplicates
      const allFields = [...standardRequired];
      missingFieldsFromAPI.forEach(field => {
        if (!allFields.find(f => f.value === field.value)) {
          allFields.push(field);
        }
      });
      
      // Debug logging
      console.log('Required fields with missing API fields:', {
        standardRequired: standardRequired.length,
        missingFieldsFromAPI: missingFieldsFromAPI.length,
        total: allFields.length,
        missingPaths: missingRequiredFields,
        foundFields: missingFieldsFromAPI.map(f => f.value)
      });
      
      return allFields;
    }
    
    return standardRequired;
  }, [missingRequiredFields, isFieldMissing, findFieldByPathOrLabel]);

  // Memoize filtered required fields - prioritize missing API fields when header is selected
  const filteredRequiredFields = useMemo(() => {
    let fields = requiredFields;
    
    // Filter by search
    if (debouncedFieldSearch) {
      const searchLower = debouncedFieldSearch.toLowerCase();
      fields = fields.filter(field => 
        field.label.toLowerCase().includes(searchLower) ||
        field.value.toLowerCase().includes(searchLower)
      );
    }
    
    // If a header is selected and there are missing API fields, prioritize them
    if (selectedHeader && missingRequiredFields.length > 0) {
      // Separate missing API fields from other fields
      const missingFields = fields.filter(field => isFieldMissing(field.value, missingRequiredFields));
      const otherFields = fields.filter(field => !isFieldMissing(field.value, missingRequiredFields));
      
      // Return missing fields first, then others
      return [...missingFields, ...otherFields];
    }
    
    return fields;
  }, [requiredFields, debouncedFieldSearch, selectedHeader, missingRequiredFields, isFieldMissing]);



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          '!max-w-[95vw] sm:!max-w-[95vw] w-full',
          // Light surface (avoid inheriting global purple background)
          'bg-white text-slate-900 border-slate-200 max-h-[95vh] overflow-y-auto transition-all duration-300 shadow-2xl'
        )}
        style={{ maxWidth: '95vw', width: '100%' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Map Invoice Fields</DialogTitle>
          <DialogDescription className="text-slate-600">
            Map your Excel file headers to invoice data structure fields. This mapping will be saved and
            automatically applied to future uploads.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Progress: <span className="font-semibold">{progress.mapped}</span> of <span className="font-semibold">{progress.total}</span> headers mapped
            </span>
            <span className="text-slate-600">
              Required: <span className="font-semibold text-amber-600">{progress.requiredMapped}</span> / <span className="font-semibold">{progress.requiredTotal}</span>
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-secondary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Missing required fields from API errors - show prominently */}
        {missingRequiredFields.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex gap-3">
            <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900 mb-2">
                ⚠️ Missing Required Fields (from API error)
              </p>
              <p className="text-xs text-red-800 mb-3">
                The following fields are required by the API but are not currently mapped. Please map them to your Excel columns:
              </p>
              <div className="flex flex-wrap gap-2">
                {missingRequiredFields.map((fieldPath) => {
                  // Find the field in INVOICE_FIELDS
                  const field = INVOICE_FIELDS.find(f => f.value === fieldPath || fieldPath.includes(f.value));
                  const fieldLabel = field ? field.label : fieldPath.replace(/\[\]/g, '').replace(/_/g, ' ').replace(/\./g, ' > ');
                  const isMapped = Object.values(mappings).includes(fieldPath);
                  
                  return (
                    <span 
                      key={fieldPath} 
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border",
                        isMapped 
                          ? "bg-green-100 text-green-800 border-green-300" 
                          : "bg-red-100 text-red-800 border-red-300 animate-pulse"
                      )}
                    >
                      {isMapped ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                      {fieldLabel}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Required fields alert */}
        {unmappedRequiredFields.length > 0 && missingRequiredFields.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-900">
                <span className="font-medium">Required fields missing:</span> Please map the following required fields before saving:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {unmappedRequiredFields.map((field) => (
                  <span key={field.value} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                    {field.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Check if headers are available */}
        {!userHeaders || userHeaders.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center space-y-3">
            <AlertCircle className="size-12 text-amber-600 mx-auto" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 mb-2">
                No Excel Headers Available
              </h4>
              <p className="text-xs text-amber-800 mb-4">
                Headers are required to map fields. Please upload your Excel file first to extract the column headers.
              </p>
              <p className="text-xs text-amber-700">
                The headers will be automatically extracted from the first row of your Excel file.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {/* Left: Headers List */}
              <div className="space-y-2 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <h5 className="text-xs font-semibold text-slate-700 uppercase">
                    Excel Headers ({sortedHeaders.length} of {userHeaders.length})
                  </h5>
                </div>
            
            {/* Search and Filter Controls */}
            <div className="space-y-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search headers..."
                  value={headerSearch}
                  onChange={(e) => setHeaderSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select 
                  value={headerFilter} 
                  onValueChange={(v: 'all' | 'mapped' | 'unmapped' | 'required') => setHeaderFilter(v)}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <Filter className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Headers</SelectItem>
                    <SelectItem value="unmapped">Unmapped</SelectItem>
                    <SelectItem value="mapped">Mapped</SelectItem>
                    <SelectItem value="required">Required Fields</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={headerSort} 
                  onValueChange={(v: 'original' | 'alphabetical' | 'mapped-first' | 'unmapped-first') => setHeaderSort(v)}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <ArrowUpDown className="size-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unmapped-first">Unmapped First</SelectItem>
                    <SelectItem value="mapped-first">Mapped First</SelectItem>
                    <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    <SelectItem value="original">Original Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(95vh - 300px)' }}>
              {sortedHeaders.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No headers found matching your criteria
                </p>
              ) : (
                <ul className="space-y-1">
                  {sortedHeaders.map((headerName) => {
                    const originalIndex = userHeaders.indexOf(headerName);
                    const isMapped = isHeaderMapped(headerName);
                    const isRequired = isMappedToRequired(headerName, mappings);
                    
                    return (
                      <li
                        key={originalIndex}
                        onClick={() => handleHeaderClick(headerName)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded border transition-colors cursor-pointer",
                          selectedHeader === headerName && "ring-2 ring-secondary border-secondary",
                          isMapped 
                            ? "bg-green-50 border-green-200 hover:bg-green-100" 
                            : "bg-white border-slate-200 hover:bg-slate-100 hover:border-secondary/40",
                          isRequired && "border-amber-300 bg-amber-50"
                        )}
                      >
                        <span className="text-xs font-mono text-slate-500 w-6">
                          {originalIndex + 1}
                        </span>
                        <span className="text-sm text-slate-900 flex-1">
                          {headerName}
                        </span>
                        {isMapped && (
                          <>
                            <CheckCircle2 className="size-4 text-green-600 flex-shrink-0" />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnmap(headerName);
                              }}
                              title="Unmap this header"
                            >
                              <X className="size-3" />
                            </Button>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Right: Required Fields List */}
          <div className="space-y-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h5 className="text-xs font-semibold text-slate-700 uppercase">
                Required Fields ({filteredRequiredFields.length})
              </h5>
            </div>
            
            {/* Search for required fields */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search required fields..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Instructions */}
            {selectedHeader && (
              <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 flex-shrink-0 space-y-2">
                <div>
                  <p className="text-xs text-slate-900">
                    <span className="font-semibold">Selected Header:</span> <code className="bg-secondary/15 px-2 py-0.5 rounded">{selectedHeader}</code>
                  </p>
                  <p className="text-xs text-slate-700 mt-1">
                    Click a required field below to map it to the selected header.
                  </p>
                </div>
                {missingRequiredFields.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                    <p className="text-xs font-semibold text-red-900 mb-1">
                      ⚠️ Missing Fields (Map These First):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {missingRequiredFields
                        .map(mf => {
                          // Find matching field in INVOICE_FIELDS
                          const field = INVOICE_FIELDS.find(f => {
                            // Exact match
                            if (f.value === mf) return true;
                            // Normalize both for comparison
                            const normalizedMissing = mf.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
                            const normalizedField = f.value.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
                            if (normalizedMissing === normalizedField) return true;
                            // Check if field value contains the missing field
                            if (f.value.includes(normalizedMissing) || normalizedMissing.includes(normalizedField)) {
                              return true;
                            }
                            // Handle item.name special case
                            if (mf.includes('item.name') && f.value.includes('item.name')) {
                              return true;
                            }
                            return false;
                          });
                          return field ? field.label : mf.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '').replace(/_/g, ' ');
                        })
                        .filter((label, index, self) => self.indexOf(label) === index) // Remove duplicates
                        .slice(0, 5) // Show first 5
                        .map((label, idx) => (
                          <span key={idx} className="text-xs text-red-800 bg-red-100 px-1.5 py-0.5 rounded border border-red-300">
                            {label}
                          </span>
                        ))}
                      {missingRequiredFields.length > 5 && (
                        <span className="text-xs text-red-700">
                          +{missingRequiredFields.length - 5} more
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-red-700 mt-1 italic">
                      These fields are shown first in the list below. Map them to fix the API error.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!selectedHeader && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex-shrink-0">
                <p className="text-xs text-slate-600">
                  Click an Excel header on the left, then click a required field here to map them.
                </p>
                {missingRequiredFields.length > 0 && (
                  <p className="text-xs text-red-700 mt-2 font-semibold">
                    💡 Tip: Missing fields from API errors are highlighted in red below. Select a header first to map them.
                  </p>
                )}
              </div>
            )}

            <Card className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(95vh - 300px)' }}>
              {filteredRequiredFields.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No required fields found matching your search
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredRequiredFields.map((field) => {
                    const isMapped = mappedFields.includes(field.value);
                    const mappedHeader = Object.keys(mappings).find(
                      (h) => mappings[h] === field.value
                    );
                    const canMap = selectedHeader && !isMapped;
                    // Check if this field is in the missing required fields from API errors
                    const isMissingFromAPI = isFieldMissing(field.value, missingRequiredFields);
                    
                    return (
                      <li
                        key={field.value}
                        onClick={() => (canMap || isMapped) && handleFieldClick(field.value)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded border transition-colors",
                          (canMap || isMapped) && "cursor-pointer",
                          canMap && "hover:bg-secondary/10 hover:border-secondary/30",
                          isMapped && "hover:bg-red-50 hover:border-red-300",
                          isMapped 
                            ? "bg-green-50 border-green-200" 
                            : isMissingFromAPI && !isMapped
                            ? "bg-red-50 border-2 border-red-400 animate-pulse"
                            : canMap
                            ? "bg-white border-slate-200"
                            : "bg-slate-100 border-slate-200 opacity-60"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {field.label}
                            </span>
                            <span className="text-red-500 text-xs">*</span>
                            {isMissingFromAPI && !isMapped && (
                              <span className="ml-2 text-xs font-bold text-red-700 bg-red-200 px-2 py-0.5 rounded border border-red-400">
                                MISSING FROM API
                              </span>
                            )}
                            {isMapped && (
                              <>
                                <CheckCircle2 className="size-4 text-green-600" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnmapField(field.value);
                                  }}
                                  title="Unmap this field"
                                >
                                  <X className="size-3" />
                                </Button>
                              </>
                            )}
                          </div>
                          {mappedHeader && (
                            <p className="text-xs text-slate-500 mt-1">
                              Mapped to: <code className="bg-slate-200 px-1.5 py-0.5 rounded">{mappedHeader}</code>
                            </p>
                          )}
                          {getFieldDescription(field.value) && (
                            <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                              <Info className="size-3 mt-0.5 flex-shrink-0" />
                              <span>{getFieldDescription(field.value)}</span>
                            </p>
                          )}
                        </div>
                        {canMap && (
                          <div className="text-xs text-secondary font-medium">
                            Click to map
                          </div>
                        )}
                        {isMapped && !selectedHeader && (
                          <div className="text-xs text-red-600 font-medium">
                            Click to unmap
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>

              {/* Legend */}
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <span className="text-red-500">*</span>
                  <span>Required fields must be mapped before saving</span>
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {userHeaders && userHeaders.length > 0 && (
              <Button onClick={handleSave} disabled={!canSave}>
                Save Mapping
              </Button>
            )}
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

