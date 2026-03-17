'use client';
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
import {
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  ArrowUpDown,
  Info,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
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
  [userHeader: string]: string; // maps user header → invoice field path
}

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userHeaders: string[];
  /** For headers whose cell value is JSON, list keys to show as sub-headers for mapping. */
  headerNestedKeys?: Record<string, string[]>;
  existingMappings?: FieldMapping;
  onSave: (mappings: FieldMapping) => void;
  onAutoSave?: (mappings: FieldMapping) => void;
  missingRequiredFields?: string[];
}

// Re-export INVOICE_FIELDS for backward compatibility
export { INVOICE_FIELDS };

// Known top-level JSON blob headers that map to sub-fields
const JSON_BLOB_HEADERS = [
  'accounting_supplier_party',
  'accounting_customer_party',
  'legal_monetary_total',
  'tax_total',
  'invoice_line',
];

export function FieldMappingDialog({
  open,
  onOpenChange,
  userHeaders,
  headerNestedKeys = {},
  existingMappings = {},
  onSave,
  onAutoSave,
  missingRequiredFields = [],
}: FieldMappingDialogProps) {
  const [mappings, setMappings] = useState<FieldMapping>(existingMappings);
  const [headerSearch, setHeaderSearch] = useState('');
  const [debouncedHeaderSearch, setDebouncedHeaderSearch] = useState('');
  const [fieldSearch, setFieldSearch] = useState('');
  const [debouncedFieldSearch, setDebouncedFieldSearch] = useState('');
  const [selectedHeader, setSelectedHeader] = useState<string | null>(null);
  const [headerFilter, setHeaderFilter] = useState<'all' | 'mapped' | 'unmapped' | 'required'>('all');
  const [headerSort, setHeaderSort] = useState<
    'original' | 'alphabetical' | 'mapped-first' | 'unmapped-first'
  >('unmapped-first');
  const [expandedJsonHeaders, setExpandedJsonHeaders] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMappings(existingMappings);
  }, [existingMappings]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedHeaderSearch(headerSearch), 300);
    return () => clearTimeout(t);
  }, [headerSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFieldSearch(fieldSearch), 300);
    return () => clearTimeout(t);
  }, [fieldSearch]);

  useEffect(() => {
    const hasChanges = JSON.stringify(mappings) !== JSON.stringify(existingMappings);
    if (hasChanges && onAutoSave) {
      const t = setTimeout(() => onAutoSave(mappings), 500);
      return () => clearTimeout(t);
    }
  }, [mappings, existingMappings, onAutoSave]);

  // Auto-expand all JSON headers when dialog opens
  useEffect(() => {
    if (open && Object.keys(headerNestedKeys).length > 0) {
      setExpandedJsonHeaders(new Set(Object.keys(headerNestedKeys)));
    }
  }, [open, headerNestedKeys]);

  // Flatten headers: JSON headers become "header.key" entries
  const effectiveHeaders = useMemo(() => {
    const list: string[] = [];
    userHeaders.forEach((h) => {
      const keys = headerNestedKeys[h];
      if (keys?.length) keys.forEach((k) => list.push(`${h}.${k}`));
      else list.push(h);
    });
    return list;
  }, [userHeaders, headerNestedKeys]);

  const progress = useMemo(
    () => calculateProgress(effectiveHeaders, mappings),
    [effectiveHeaders, mappings]
  );
  
  const mappedFields = useMemo(
    () => Object.values(mappings).filter((v) => v && v !== 'skip'),
    [mappings]
  );

  const unmappedRequiredFields = useMemo(() => getUnmappedRequiredFields(mappings), [mappings]);

  const handleMappingChange = useCallback((userHeader: string, invoiceField: string) => {
    setMappings((prev) => ({ ...prev, [userHeader]: invoiceField }));
    setSelectedHeader(null);
  }, []);

  const handleHeaderClick = useCallback(
    (userHeader: string) => {
      setSelectedHeader(selectedHeader === userHeader ? null : userHeader);
    },
    [selectedHeader]
  );

  const handleUnmapField = useCallback((fieldValue: string) => {
    setMappings((prev) => {
      const next = { ...prev };
      const h = Object.keys(next).find((k) => next[k] === fieldValue);
      if (h) delete next[h];
      return next;
    });
  }, []);

  const handleFieldClick = useCallback(
    (fieldValue: string) => {
    if (selectedHeader) {
      handleMappingChange(selectedHeader, fieldValue);
    } else {
        const mappedHeader = Object.keys(mappings).find((h) => mappings[h] === fieldValue);
        if (mappedHeader) handleUnmapField(fieldValue);
      }
    },
    [selectedHeader, handleMappingChange, mappings, handleUnmapField]
  );

  const handleUnmap = useCallback(
    (userHeader: string) => {
    setMappings((prev) => {
        const next = { ...prev };
        delete next[userHeader];
        return next;
      });
      if (selectedHeader === userHeader) setSelectedHeader(null);
    },
    [selectedHeader]
  );

  const handleSave = useCallback(() => {
    onSave(mappings);
      try {
        localStorage.setItem('invoiceFieldMappings', JSON.stringify(mappings));
    } catch {}
    onOpenChange(false);
  }, [mappings, onSave, onOpenChange]);

  const isHeaderMapped = useCallback(
    (userHeader: string) => !!(mappings[userHeader] && mappings[userHeader] !== 'skip'),
    [mappings]
  );

  const canSave = useMemo(() => validateRequiredMappings(mappings), [mappings]);

  const filteredHeaders = useMemo(() => {
    let list = filterHeaders(userHeaders, debouncedHeaderSearch, mappings, headerFilter);
    if (headerFilter === 'mapped') {
      const withNestedMapped = userHeaders.filter((h) => {
        const keys = headerNestedKeys[h];
        if (!keys?.length) return false;
        return keys.some((k) => mappings[`${h}.${k}`] && mappings[`${h}.${k}`] !== 'skip');
      });
      list = [...new Set([...list, ...withNestedMapped])];
    }
    return list;
  }, [userHeaders, debouncedHeaderSearch, mappings, headerFilter, headerNestedKeys]);
  
  const sortedHeaders = useMemo(
    () => sortHeaders(filteredHeaders, mappings, headerSort, userHeaders),
    [filteredHeaders, mappings, headerSort, userHeaders]
  );

  const toggleJsonHeaderExpand = useCallback((headerName: string) => {
    setExpandedJsonHeaders((prev) => {
      const next = new Set(prev);
      if (next.has(headerName)) next.delete(headerName);
      else next.add(headerName);
      return next;
    });
  }, []);

  const findFieldByPathOrLabel = useCallback((searchPath: string): InvoiceField | null => {
    let field = INVOICE_FIELDS.find((f) => f.value === searchPath);
    if (field) return field;
    const norm = searchPath.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
    field = INVOICE_FIELDS.find((f) => {
      const nf = f.value.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
      return norm === nf || f.value.includes(norm) || norm.includes(nf);
    });
    if (field) return field;
    const searchLabel = norm.replace(/_/g, ' ').replace(/\./g, ' ').toLowerCase();
    field = INVOICE_FIELDS.find((f) => {
      const fl = f.label.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      return fl.includes(searchLabel) || searchLabel.includes(fl.replace(/\s+/g, ''));
    });
    if (field) return field;
    const lastPart = norm.split('.').pop() || '';
    if (lastPart) {
      field = INVOICE_FIELDS.find((f) => {
        const flp = f.value.split('.').pop() || '';
        return (
          flp.toLowerCase() === lastPart.toLowerCase() ||
          flp.toLowerCase().includes(lastPart.toLowerCase()) ||
          lastPart.toLowerCase().includes(flp.toLowerCase())
        );
      });
    }
    return field || null;
  }, []);

  const isFieldMissing = useCallback(
    (fieldValue: string, missingPaths: string[]): boolean => {
      if (!missingPaths.length) return false;
      return missingPaths.some((mf) => {
      if (mf === fieldValue) return true;
        const nm = mf.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
        const nf = fieldValue.replace(/\[\d*\]/g, '[]').replace(/\[\]/g, '');
        if (nm === nf) return true;
        if (fieldValue.includes(nm) || nm.includes(nf)) return true;
        if (mf.includes('item.name') && fieldValue.includes('item.name')) return true;
        const found = findFieldByPathOrLabel(mf);
        return !!(found && found.value === fieldValue);
      });
    },
    [findFieldByPathOrLabel]
  );

  const filteredRequiredFields = useMemo(() => {
    let fields = debouncedFieldSearch ? filterInvoiceFields(debouncedFieldSearch) : [...INVOICE_FIELDS];
    if (selectedHeader && missingRequiredFields.length > 0) {
      const missing = fields.filter((f) => isFieldMissing(f.value, missingRequiredFields));
      const other = fields.filter((f) => !isFieldMissing(f.value, missingRequiredFields));
      return [...missing, ...other];
    }
    return fields;
  }, [debouncedFieldSearch, selectedHeader, missingRequiredFields, isFieldMissing]);

  const fieldsByCategory = useMemo(
    () => groupFieldsByCategory(filteredRequiredFields),
    [filteredRequiredFields]
  );

  // ─── Render a single header row (non-JSON or JSON with nested keys) ───────────
  const renderHeaderItem = (headerName: string) => {
    const originalIndex = userHeaders.indexOf(headerName);
    const nestedKeys = headerNestedKeys[headerName];
    const hasNested = nestedKeys && nestedKeys.length > 0;
    const isExpanded = expandedJsonHeaders.has(headerName);

    // ── JSON header WITH detected nested keys ─────────────────────────────────
    if (hasNested) {
      return (
        <li key={`${originalIndex}-json`}>
          <div
            onClick={() => toggleJsonHeaderExpand(headerName)}
            className="flex items-center gap-2 px-3 py-2 rounded border cursor-pointer bg-slate-100/80 border-slate-200 hover:bg-slate-200/80"
          >
            <span className="text-xs font-mono text-slate-500 w-6 flex-shrink-0">
              {originalIndex + 1}
            </span>
            {isExpanded ? (
              <ChevronDown className="size-4 text-slate-500 flex-shrink-0" />
            ) : (
              <ChevronRight className="size-4 text-slate-500 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-700 block">{headerName}</span>
              <span className="text-xs text-slate-500 block mt-0.5">
                JSON — {nestedKeys.length} key{nestedKeys.length !== 1 ? 's' : ''}: click to expand
              </span>
            </div>
          </div>

          {isExpanded && (
            <ul className="mt-1 ml-4 pl-2 border-l-2 border-slate-200 space-y-1">
              {nestedKeys.map((key) => {
                const fullKey = `${headerName}.${key}`;
                const isMapped = isHeaderMapped(fullKey);
                const isRequired = isMappedToRequired(fullKey, mappings);
                const mappedFieldPath = mappings[fullKey];
                const mappedField =
                  mappedFieldPath && mappedFieldPath !== 'skip'
                    ? INVOICE_FIELDS.find((f) => f.value === mappedFieldPath)
                    : null;
                const mappedLabel = mappedField
                  ? mappedField.label
                  : (mappedFieldPath || '').replace(/\[\]/g, '').replace(/_/g, ' ');
                const subtitle = isMapped
                  ? `Mapped to: ${mappedLabel}`
                  : selectedHeader === fullKey
                  ? 'Click a field on the right to map'
                  : null;

                return (
                  <li
                    key={fullKey}
                    onClick={() => handleHeaderClick(fullKey)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded border transition-colors cursor-pointer',
                      selectedHeader === fullKey && 'ring-2 ring-secondary border-secondary',
                      isMapped
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-white border-slate-200 hover:bg-slate-100 hover:border-secondary/40',
                      isRequired && 'border-amber-300 bg-amber-50'
                    )}
                  >
                    <span className="text-xs font-mono text-slate-400 w-6 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-900 block">{key}</span>
                      {subtitle && (
                        <span
                          className={cn(
                            'text-xs block mt-0.5',
                            isMapped ? 'text-green-700' : 'text-secondary'
                          )}
                        >
                          {subtitle}
                        </span>
                      )}
                    </div>
                    {isMapped && (
                      <>
                        <CheckCircle2 className="size-4 text-green-600 flex-shrink-0" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnmap(fullKey);
                          }}
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
        </li>
      );
    }

    // ── Regular header OR JSON blob header with NO detected nested keys ────────
    const isMapped = isHeaderMapped(headerName);
    const isRequired = isMappedToRequired(headerName, mappings);
    const mappedFieldPath = mappings[headerName];
    const mappedField =
      mappedFieldPath && mappedFieldPath !== 'skip'
        ? INVOICE_FIELDS.find((f) => f.value === mappedFieldPath)
        : null;
    const mappedLabel = mappedField
      ? mappedField.label
      : (mappedFieldPath || '').replace(/\[\]/g, '').replace(/_/g, ' ');
    const subtitle = isMapped
      ? `Mapped to: ${mappedLabel}`
      : selectedHeader === headerName
      ? 'Click a field on the right to map'
      : null;

    // Detect if this is a known JSON blob header that has no nested keys parsed
    const isJsonBlobHeader =
      !headerName.includes('.') && JSON_BLOB_HEADERS.includes(headerName) && !hasNested;

    // Invoice fields that belong to this JSON blob header
    const relatedFields = isJsonBlobHeader
      ? INVOICE_FIELDS.filter((f) =>
          f.value === headerName ||
          f.value.startsWith(`${headerName}.`) ||
          f.value.startsWith(`${headerName}[`)
        )
      : [];

    return (
      <li
        key={originalIndex}
        onClick={() => handleHeaderClick(headerName)}
        className={cn(
          'flex flex-col gap-1 px-3 py-2 rounded border transition-colors cursor-pointer',
          selectedHeader === headerName && 'ring-2 ring-secondary border-secondary',
          isMapped
            ? 'bg-green-50 border-green-200 hover:bg-green-100'
            : 'bg-white border-slate-200 hover:bg-slate-100 hover:border-secondary/40',
          isRequired && 'border-amber-300 bg-amber-50'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-500 w-6 flex-shrink-0">
            {originalIndex + 1}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-slate-900 block">{headerName}</span>
            {subtitle && (
              <span
                className={cn(
                  'text-xs block mt-0.5',
                  isMapped ? 'text-green-700' : 'text-secondary'
                )}
              >
                {subtitle}
              </span>
            )}
            {isJsonBlobHeader && !isMapped && (
              <span className="text-xs text-blue-600 block mt-0.5">
                JSON blob — use dropdown below to map
              </span>
            )}
          </div>
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
              >
                <X className="size-3" />
              </Button>
            </>
          )}
        </div>

        {/* ── Dropdown for JSON blob headers with no auto-detected nested keys ── */}
        {isJsonBlobHeader && relatedFields.length > 0 && (
          <div
            className="mt-1 w-full"
            onClick={(e) => e.stopPropagation()} // prevent triggering handleHeaderClick
          >
            <select
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-secondary"
              value={mappings[headerName] || ''}
              onChange={(e) => {
                if (e.target.value) handleMappingChange(headerName, e.target.value);
              }}
            >
              <option value="" disabled>
                Select a field to map &quot;{headerName}&quot; to...
              </option>
              {relatedFields.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}{f.required ? ' *' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Can&apos;t parse nested keys — map the whole column to a single field above.
            </p>
          </div>
        )}
      </li>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!max-w-[95vw] sm:!max-w-[95vw] w-full bg-white text-slate-900 border-slate-200 max-h-[95vh] overflow-y-auto shadow-2xl"
        style={{ maxWidth: '95vw', width: '100%' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Map Invoice Fields</DialogTitle>
          <DialogDescription className="text-slate-600">
            Map your Excel file headers to invoice fields. Click a header on the left, then click a
            field on the right. For JSON blob columns, use the dropdown to pick a field.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">
              Progress:{' '}
              <span className="font-semibold">{progress.mapped}</span> of{' '}
              <span className="font-semibold">{progress.total}</span> headers mapped
            </span>
            <span className="text-slate-600">
              Required:{' '}
              <span className="font-semibold text-amber-600">{progress.requiredMapped}</span> /{' '}
              <span className="font-semibold">{progress.requiredTotal}</span>
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-secondary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
        </div>

        {/* Missing required fields banner */}
        {missingRequiredFields.length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 flex gap-3">
            <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-900 mb-2">
                Missing required fields — please map them below
              </p>
              <div className="flex flex-wrap gap-2">
                {missingRequiredFields.map((fieldPath) => {
                  const field = INVOICE_FIELDS.find(
                    (f) => f.value === fieldPath || fieldPath.includes(f.value)
                  );
                  const label = field
                    ? field.label
                    : fieldPath.replace(/\[\]/g, '').replace(/_/g, ' ').replace(/\./g, ' > ');
                  const isMapped = Object.values(mappings).includes(fieldPath);
                  return (
                    <span 
                      key={fieldPath} 
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border',
                        isMapped 
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                      )}
                    >
                      {isMapped ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <AlertCircle className="size-3" />
                      )}
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Unmapped required fields warning */}
        {unmappedRequiredFields.length > 0 && missingRequiredFields.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-900">
                <span className="font-medium">Required fields not yet mapped:</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {unmappedRequiredFields.map((field) => (
                  <span
                    key={field.value}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300"
                  >
                    {field.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {!userHeaders || userHeaders.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center space-y-3">
            <AlertCircle className="size-12 text-amber-600 mx-auto" />
            <h4 className="text-sm font-semibold text-amber-900">No Excel Headers Available</h4>
            <p className="text-xs text-amber-800">Upload your Excel file first.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
              {/* ── LEFT: Excel Headers ─────────────────────────────────────── */}
              <div className="space-y-2 flex flex-col min-h-0">
                  <h5 className="text-xs font-semibold text-slate-700 uppercase">
                    Excel Headers ({sortedHeaders.length} of {userHeaders.length})
                  </h5>
            
            <div className="space-y-2 flex-shrink-0">
              <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
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
                      onValueChange={(v: 'all' | 'mapped' | 'unmapped' | 'required') =>
                        setHeaderFilter(v)
                      }
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
                      onValueChange={(
                        v: 'original' | 'alphabetical' | 'mapped-first' | 'unmapped-first'
                      ) => setHeaderSort(v)}
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

                <Card
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex-1 min-h-0 overflow-y-auto"
                  style={{ maxHeight: 'calc(95vh - 300px)' }}
                >
              {sortedHeaders.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  No headers found matching your criteria
                </p>
              ) : (
                    <ul className="space-y-1">{sortedHeaders.map(renderHeaderItem)}</ul>
              )}
            </Card>
          </div>

              {/* ── RIGHT: Invoice Fields ────────────────────────────────────── */}
          <div className="space-y-2 flex flex-col min-h-0">
              <h5 className="text-xs font-semibold text-slate-700 uppercase">
                  Invoice Fields ({filteredRequiredFields.length}) — by category
              </h5>
            
            <div className="relative flex-shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                type="text"
                    placeholder="Search invoice fields..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="pl-9"
              />
            </div>

                {selectedHeader ? (
                  <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 flex-shrink-0">
                  <p className="text-xs text-slate-900">
                      <span className="font-semibold">Selected:</span>{' '}
                      <code className="bg-secondary/15 px-2 py-0.5 rounded">{selectedHeader}</code>
                  </p>
                  <p className="text-xs text-slate-700 mt-1">
                      Click a field below to map it.
                  </p>
                </div>
                ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex-shrink-0">
                <p className="text-xs text-slate-600">
                      Click an Excel header on the left, then click a field here to map them.
                </p>
              </div>
            )}

                <Card
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex-1 min-h-0 overflow-y-auto"
                  style={{ maxHeight: 'calc(95vh - 300px)' }}
                >
              {filteredRequiredFields.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                      No fields found matching your search
                </p>
              ) : (
                    <ul className="space-y-4">
                      {Object.entries(fieldsByCategory).map(([category, fields]) => (
                        <li key={category}>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            {category}
                          </p>
                <ul className="space-y-2">
                            {fields.map((field) => {
                    const isMapped = mappedFields.includes(field.value);
                    const mappedHeader = Object.keys(mappings).find(
                      (h) => mappings[h] === field.value
                    );
                              const canMap = !!selectedHeader && !isMapped;
                              const isMissingFromAPI = isFieldMissing(
                                field.value,
                                missingRequiredFields
                              );
                    
                    return (
                      <li
                        key={field.value}
                                  onClick={() =>
                                    (canMap || isMapped) && handleFieldClick(field.value)
                                  }
                        className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded border transition-colors',
                                    (canMap || isMapped) && 'cursor-pointer',
                                    canMap && 'hover:bg-secondary/10 hover:border-secondary/30',
                                    isMapped && 'hover:bg-red-50 hover:border-red-300',
                          isMapped 
                                      ? 'bg-green-50 border-green-200'
                            : isMissingFromAPI && !isMapped
                                      ? 'bg-red-50 border-2 border-red-400 animate-pulse'
                            : canMap
                                      ? 'bg-white border-slate-200'
                                      : 'bg-slate-100 border-slate-200 opacity-60'
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900">
                              {field.label}
                            </span>
                                      {field.required && (
                            <span className="text-red-500 text-xs">*</span>
                                      )}
                            {isMissingFromAPI && !isMapped && (
                              <span className="ml-2 text-xs font-bold text-red-700 bg-red-200 px-2 py-0.5 rounded border border-red-400">
                                          REQUIRED
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
                                >
                                  <X className="size-3" />
                                </Button>
                              </>
                            )}
                          </div>
                          {mappedHeader && (
                            <p className="text-xs text-slate-500 mt-1">
                                        Mapped to:{' '}
                                        <code className="bg-slate-200 px-1.5 py-0.5 rounded">
                                          {mappedHeader}
                                        </code>
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
                                    <div className="text-xs text-secondary font-medium whitespace-nowrap">
                            Click to map
                          </div>
                        )}
                        {isMapped && !selectedHeader && (
                                    <div className="text-xs text-red-600 font-medium whitespace-nowrap">
                            Click to unmap
                          </div>
                        )}
                      </li>
                    );
                  })}
                          </ul>
                        </li>
                      ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

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