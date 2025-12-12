'use client'
import { useState, useEffect, useRef } from 'react';
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
import { AlertCircle, CheckCircle2, Search, Sparkles, Filter, ArrowUpDown, Info } from 'lucide-react';
import { cn } from '@/components/ui/utils';
import {
  INVOICE_FIELDS,
  calculateProgress,
  filterHeaders,
  sortHeaders,
  filterInvoiceFields,
  groupFieldsByCategory,
  getFieldDescription,
  getUnmappedRequiredFields,
  validateRequiredMappings,
  getSuggestedMappings,
  isMappedToRequired,
} from './utils/fieldMappingUtils';

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
}: FieldMappingDialogProps) {
  const [mappings, setMappings] = useState<FieldMapping>(existingMappings);
  const [headerSearch, setHeaderSearch] = useState<string>('');
  const [fieldSearchMap, setFieldSearchMap] = useState<Record<string, string>>({});
  const [headerFilter, setHeaderFilter] = useState<'all' | 'mapped' | 'unmapped' | 'required'>('all');
  const [headerSort, setHeaderSort] = useState<'original' | 'alphabetical' | 'mapped-first' | 'unmapped-first'>('unmapped-first');
  const mappingRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setMappings(existingMappings);
  }, [existingMappings]);

  // Auto-save mappings whenever they change (debounced)
  useEffect(() => {
    // Only auto-save if mappings have actually changed from initial state
    // Skip initial render to avoid saving immediately when dialog opens
    const hasChanges = JSON.stringify(mappings) !== JSON.stringify(existingMappings);
    
    if (hasChanges && (Object.keys(mappings).length > 0 || Object.keys(existingMappings).length > 0)) {
      const timeoutId = setTimeout(() => {
        // Auto-save using onAutoSave if provided, otherwise use onSave
        if (onAutoSave) {
          onAutoSave(mappings);
        }
      }, 1000); // Debounce: save 1 second after last change

      return () => clearTimeout(timeoutId);
    }
  }, [mappings, existingMappings, onAutoSave]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate progress
  const progress = calculateProgress(userHeaders, mappings);
  
  // Get suggested mappings
  const suggestions = getSuggestedMappings(userHeaders, mappings);

  const handleMappingChange = (userHeader: string, invoiceField: string) => {
    setMappings((prev) => ({
      ...prev,
      [userHeader]: invoiceField,
    }));
  };

  const handleSkip = (userHeader: string) => {
    setMappings((prev) => {
      const newMappings = { ...prev };
      delete newMappings[userHeader];
      return newMappings;
    });
  };

  const handleApplySuggestion = (userHeader: string) => {
    const suggestion = suggestions.get(userHeader);
    if (suggestion) {
      handleMappingChange(userHeader, suggestion.field.value);
    }
  };

  const handleSave = () => {
    onSave(mappings);
    onOpenChange(false);
  };

  const isHeaderMapped = (userHeader: string) => {
    return !!(mappings[userHeader] && mappings[userHeader] !== 'skip');
  };

  const canSave = () => {
    return validateRequiredMappings(mappings);
  };

  // Filter and sort headers
  const filteredHeaders = filterHeaders(userHeaders, headerSearch, mappings, headerFilter);
  const sortedHeaders = sortHeaders(filteredHeaders, mappings, headerSort, userHeaders);

  // Filter invoice fields based on search for a specific header
  const getFilteredFieldsForHeader = (userHeader: string) => {
    const searchTerm = fieldSearchMap[userHeader] || '';
    return filterInvoiceFields(searchTerm);
  };

  // Group fields by category
  const getFieldsByCategory = (fields: typeof INVOICE_FIELDS) => {
    return groupFieldsByCategory(fields);
  };

  const handleFieldSearchChange = (userHeader: string, value: string) => {
    setFieldSearchMap((prev) => ({
      ...prev,
      [userHeader]: value,
    }));
  };

  // Scroll to mapping when header is clicked
  const scrollToMapping = (userHeader: string) => {
    const element = mappingRefs.current[userHeader];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500');
      }, 2000);
    }
  };

  const getMappedFields = () => {
    return Object.values(mappings).filter((v) => v && v !== 'skip');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          '!max-w-[95vw] sm:!max-w-[95vw] w-full',
          'max-h-[95vh] overflow-y-auto transition-all duration-300'
        )}
        style={{ maxWidth: '95vw', width: '100%' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Map Invoice Fields</DialogTitle>
          <DialogDescription>
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
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Required fields alert */}
        {getUnmappedRequiredFields(mappings).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-900">
                <span className="font-medium">Required fields missing:</span> Please map the following required fields before saving:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {getUnmappedRequiredFields(mappings).map((field) => (
                  <span key={field.value} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                    {field.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Left: Headers List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-slate-700 uppercase">
                Excel Headers ({sortedHeaders.length} of {userHeaders.length})
              </h5>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="space-y-2">
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

            <Card className="p-4 border border-slate-200 rounded-lg bg-slate-50 max-h-[600px] overflow-y-auto">
              {sortedHeaders.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No headers found matching your criteria
                </p>
              ) : (
                <ul className="space-y-1">
                  {sortedHeaders.map((headerName) => {
                    const originalIndex = userHeaders.indexOf(headerName);
                    const isMapped = isHeaderMapped(headerName);
                    const suggestion = suggestions.get(headerName);
                    const isRequired = isMappedToRequired(headerName, mappings);
                    
                    return (
                      <li
                        key={originalIndex}
                        onClick={() => scrollToMapping(headerName)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded border transition-colors cursor-pointer",
                          isMapped 
                            ? "bg-green-50 border-green-200 hover:bg-green-100" 
                            : "bg-white border-slate-200 hover:bg-slate-100 hover:border-blue-300",
                          isRequired && "border-amber-300 bg-amber-50"
                        )}
                      >
                        <span className="text-xs font-mono text-slate-500 w-6">
                          {originalIndex + 1}
                        </span>
                        <span className="text-sm text-slate-900 flex-1">
                          {headerName}
                        </span>
                        {suggestion && !isMapped && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySuggestion(headerName);
                            }}
                            title={`Auto-map to ${suggestion.field.label}`}
                          >
                            <Sparkles className="size-3 mr-1 text-blue-500" />
                            Auto
                          </Button>
                        )}
                        {isMapped && (
                          <CheckCircle2 className="size-4 text-green-600 flex-shrink-0" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Right: Mapping Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-slate-700 uppercase">
                Map to Invoice Fields
              </h5>
            </div>
            <Card className="p-4 border border-slate-200 rounded-lg max-h-[600px] overflow-y-auto">
              <div className="space-y-4">
                {userHeaders.map((userHeader) => {
                  const currentMapping = mappings[userHeader];
                  const invoiceField = INVOICE_FIELDS.find(
                    (f) => f.value === currentMapping
                  );
                  const isMapped = isHeaderMapped(userHeader);
                  const filteredFields = getFilteredFieldsForHeader(userHeader);
                  const fieldsByCategory = getFieldsByCategory(filteredFields);
                  const searchTerm = fieldSearchMap[userHeader] || '';

                  return (
                    <div
                      key={userHeader}
                      ref={(el) => {
                        mappingRefs.current[userHeader] = el;
                      }}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        isMapped 
                          ? "bg-green-50 border-green-200" 
                          : "bg-white border-slate-200"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded block truncate">
                            {userHeader}
                          </code>
                        </div>
                        {isMapped && (
                          <CheckCircle2 className="size-4 text-green-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <Select
                        value={currentMapping || ''}
                        onValueChange={(value) =>
                          value === 'skip'
                            ? handleSkip(userHeader)
                            : handleMappingChange(userHeader, value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select invoice field..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[400px]">
                          {/* Search input inside dropdown */}
                          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-2">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 size-3 text-slate-400" />
                              <Input
                                type="text"
                                placeholder="Search invoice fields..."
                                value={searchTerm}
                                onChange={(e) => handleFieldSearchChange(userHeader, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="pl-7 h-8 text-xs"
                                autoFocus
                              />
                            </div>
                          </div>
                          <SelectItem value="skip" className="text-slate-500">
                            Skip this field
                          </SelectItem>
                          {Object.keys(fieldsByCategory).length === 0 ? (
                            <div className="px-2 py-4 text-xs text-slate-500 text-center">
                              No fields found matching &quot;{searchTerm}&quot;
                            </div>
                          ) : (
                            Object.entries(fieldsByCategory).map(([category, fields]) => (
                              <div key={category}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase bg-slate-100 sticky top-[41px] z-10">
                                  {category}
                                </div>
                                {fields.map((field) => {
                                  const isAlreadyMapped =
                                    getMappedFields().includes(field.value) &&
                                    currentMapping !== field.value;
                                  return (
                                    <SelectItem
                                      key={field.value}
                                      value={field.value}
                                      disabled={isAlreadyMapped}
                                      className="pl-4"
                                    >
                                      {field.label}
                                      {field.required && (
                                        <span className="text-red-500 ml-1">*</span>
                                      )}
                                      {isAlreadyMapped && (
                                        <span className="text-slate-400 text-xs ml-2">
                                          (already mapped)
                                        </span>
                                      )}
                                    </SelectItem>
                                  );
                                })}
                              </div>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {invoiceField && (
                        <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                          <p className="text-xs text-slate-600 mb-1">
                            <span className="font-medium">Maps to:</span> {invoiceField.label}
                            {invoiceField.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </p>
                          {getFieldDescription(invoiceField.value) && (
                            <p className="text-xs text-slate-500 flex items-start gap-1">
                              <Info className="size-3 mt-0.5 flex-shrink-0" />
                              <span>{getFieldDescription(invoiceField.value)}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave()}>
            Save Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

