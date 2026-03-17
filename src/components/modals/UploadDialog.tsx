'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/components/ui/toaster';
import { API_END_POINT } from '@/app/config/Api';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: () => void;
}

// Fields that must always be strings (never numbers)
const STRING_FIELDS = [
  'invoice_number', 'invoice_type_code', 'document_currency_code', 'tax_currency_code',
  'payment_status', 'business_id', 'note', 'buyer_reference', 'order_reference',
  'accounting_cost', 'payment_terms_note', 'irn', 'party_name', 'tin', 'email',
  'telephone', 'street_name', 'city_name', 'postal_zone', 'country', 'state', 'lga',
  'business_description', 'hsn_code', 'product_category', 'price_unit',
  'sellers_item_identification', 'name', 'description', 'id', 'payment_means_code',
];

// Fields that must always be YYYY-MM-DD strings
const DATE_FIELDS = [
  'issue_date', 'due_date', 'tax_point_date', 'actual_delivery_date',
  'start_date', 'end_date', 'payment_due_date',
];

// Convert any date value into YYYY-MM-DD (API expects this format)
const toDateString = (value: any): string => {
  if (value === null || value === undefined || value === '') return '';
  const s = typeof value === 'string' ? value.trim() : String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date.toISOString().substring(0, 10);
  }
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) return value.toISOString().substring(0, 10);
  }
  if (typeof value === 'string') {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().substring(0, 10);
  }
  return s;
};

// Coerce leaf value to the right type
const coerce = (key: string, value: any): any => {
  if (DATE_FIELDS.includes(key)) return toDateString(value);
  if (STRING_FIELDS.includes(key)) return String(value).replace(/\.0$/, '').trim();
  return value;
};

const toNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const s = String(value).trim();
  const match = s.match(/[\d.]+/);
  if (match) {
    const n = parseFloat(match[0]);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
};

const ALLOWED_TAX_CATEGORY_IDS = [
  'STANDARD_GST', 'REDUCED_GST', 'ZERO_GST', 'STANDARD_VAT', 'REDUCED_VAT', 'ZERO_VAT',
  'STATE_SALES_TAX', 'LOCAL_SALES_TAX', 'ALCOHOL_EXCISE_TAX', 'TOBACCO_EXCISE_TAX', 'FUEL_EXCISE_TAX',
  'CORPORATE_INCOME_TAX', 'PERSONAL_INCOME_TAX', 'SOCIAL_SECURITY_TAX', 'MEDICARE_TAX', 'REAL_ESTATE_TAX',
  'PERSONAL_PROPERTY_TAX', 'CARBON_TAX', 'PLASTIC_TAX', 'IMPORT_DUTY', 'EXPORT_DUTY', 'LUXURY_TAX', 'SERVICE_TAX', 'TOURISM_TAX',
];

const normalizeTaxCategoryId = (value: any): string => {
  const s = String(value ?? '').replace(/["',\s]/g, '').trim().toUpperCase();
  if (!s) return '';
  if (ALLOWED_TAX_CATEGORY_IDS.includes(s)) return s;
  const match = ALLOWED_TAX_CATEGORY_IDS.find((id) => s.includes(id) || id.includes(s));
  return match ?? s;
};

const normalizeTelephone = (value: any): string => {
  if (value === null || value === undefined) return '';
  const s = String(value).trim();
  if (!s) return '';
  if (s.startsWith('+')) return s;
  if (/^0\d{9,}$/.test(s.replace(/\s/g, ''))) return '+234' + s.replace(/\s/g, '').replace(/^0/, '');
  return '+' + s.replace(/\s/g, '');
};

const tryParseJson = (val: any): object | null => {
  if (val && typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val !== 'string' || !val.trim()) return null;

  const s = val.trim();

  const closingBracesNeeded = (str: string): number => {
    let depth = 0;
    for (const ch of str) {
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
    }
    return depth;
  };

  const attempts: string[] = [
    s,
    s + '}'.repeat(Math.max(0, closingBracesNeeded(s))),
    `{${s}` + '}'.repeat(Math.max(0, closingBracesNeeded(`{${s}`))),
    `{"${s}` + '}'.repeat(Math.max(0, closingBracesNeeded(`{"${s}`))),
  ];

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return null;
};

/** Recursively sanitize payload so the API can parse it: dates to YYYY-MM-DD, remove/reshape problematic fields. */
function sanitizePayloadForApi(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => sanitizePayloadForApi(item));

  if (typeof obj === 'object') {
    const out: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'payment_means') {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          out[key] = sanitizePayloadForApi(value);
        }
        continue;
      }
      if (DATE_FIELDS.includes(key)) {
        out[key] = toDateString(value);
        continue;
      }
      if (typeof value === 'number' && (Number.isNaN(value) || !Number.isFinite(value))) {
        continue;
      }
      out[key] = sanitizePayloadForApi(value);
    }
    if (Array.isArray(out.tax_total)) {
      out.tax_total = out.tax_total.map((tt: any) => {
        if (tt && typeof tt.tax_subtotal === 'object' && !Array.isArray(tt.tax_subtotal)) {
          return { ...tt, tax_subtotal: [tt.tax_subtotal] };
        }
        return tt;
      });
      out.tax_total = out.tax_total.map((tt: any) => {
        if (!tt || !Array.isArray(tt.tax_subtotal)) return tt;
        tt.tax_subtotal = tt.tax_subtotal.map((st: any) => {
          if (!st) return st;
          const sub = { ...st };
          if (sub.taxable_amount != null && sub.taxable_amount !== '') sub.taxable_amount = toNumber(sub.taxable_amount);
          else if (sub.tax_amount != null && sub.tax_amount !== '') sub.taxable_amount = toNumber(sub.tax_amount);
          if (sub.tax_category && typeof sub.tax_category === 'object' && sub.tax_category.id != null && sub.tax_category.id !== '') {
            sub.tax_category = { ...sub.tax_category, id: normalizeTaxCategoryId(sub.tax_category.id) };
          }
          return sub;
        });
        return tt;
      });
    }
    if (Array.isArray(out.invoice_line)) {
      out.invoice_line = out.invoice_line.map((line: any) => {
        if (!line || typeof line !== 'object') return line;
        const normalized = { ...line };
        if (normalized.invoiced_quantity != null && normalized.invoiced_quantity !== '') normalized.invoiced_quantity = toNumber(normalized.invoiced_quantity);
        if (normalized.price && typeof normalized.price === 'object') {
          if (normalized.price.price_amount != null && normalized.price.price_amount !== '') normalized.price = { ...normalized.price, price_amount: toNumber(normalized.price.price_amount) };
          if (normalized.price.base_quantity != null && normalized.price.base_quantity !== '') normalized.price = { ...normalized.price, base_quantity: toNumber(normalized.price.base_quantity) };
        }
        if (normalized.line_extension_amount != null && normalized.line_extension_amount !== '') normalized.line_extension_amount = toNumber(normalized.line_extension_amount);
        return normalized;
      });
    }
    if ('business_id' in obj && 'payment_status' in obj) {
      if (out.legal_monetary_total && typeof out.legal_monetary_total === 'object') {
        const lm = out.legal_monetary_total;
        if (lm.line_extension_amount != null && lm.line_extension_amount !== '') lm.line_extension_amount = toNumber(lm.line_extension_amount);
        if (lm.payable_amount != null && lm.payable_amount !== '') lm.payable_amount = toNumber(lm.payable_amount);
        if (lm.tax_exclusive_amount != null && lm.tax_exclusive_amount !== '') lm.tax_exclusive_amount = toNumber(lm.tax_exclusive_amount);
        if (lm.tax_inclusive_amount != null && lm.tax_inclusive_amount !== '') lm.tax_inclusive_amount = toNumber(lm.tax_inclusive_amount);
      }
      if (out.accounting_supplier_party?.telephone != null) {
        out.accounting_supplier_party.telephone = normalizeTelephone(out.accounting_supplier_party.telephone);
      }
      if (out.accounting_customer_party?.telephone != null) {
        out.accounting_customer_party.telephone = normalizeTelephone(out.accounting_customer_party.telephone);
      }
    }
    return out;
  }

  return obj;
}

/** Returns true if every value in the row is empty / blank / meaningless */
const isRowEmpty = (row: Record<string, any>): boolean =>
  Object.values(row).every((v) => {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string') return v.trim() === '';
    // XLSX sometimes fills empty date cells with the epoch (Dec 31 1899)
    if (v instanceof Date) {
      return isNaN(v.getTime()) || v.getFullYear() <= 1900;
    }
    // XLSX sometimes fills empty numeric cells with 0
    if (typeof v === 'number') return v === 0;
    if (typeof v === 'boolean') return false;
    return false;
  });

/** Trim whitespace from header keys and all string values in a row */
const trimRow = (row: Record<string, any>): Record<string, any> =>
  Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.trim(),
      typeof v === 'string' ? v.trim() : v,
    ])
  );

export function UploadDialog({ open, onOpenChange, onUploadSuccess }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'pending' | 'success' | 'error' | 'failed' | 'partial_success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    if (!open) {
      setFile(null);
      setRows([]);
      setHeaders([]);
      setUploading(false);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  }, [open]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await selected.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];

      // Trim header keys and string values, then drop fully empty rows
      const nonEmpty = json
        .map(trimRow)
        .filter((row) => !isRowEmpty(row));

      if (!nonEmpty.length) {
        addToast({ variant: 'error', title: 'Empty File', description: 'No data found in the file.' });
        return;
      }

      setFile(selected);
      setHeaders(Object.keys(nonEmpty[0]));
      setRows(nonEmpty);
      setUploadStatus('idle');
      setErrorMessage('');
    } catch {
      addToast({ variant: 'error', title: 'Parse Error', description: 'Could not read the file.' });
    }
  };

  const buildPayload = (row: Record<string, any>): any => {
    const payload: any = {};

    payload.payment_status = 'PENDING';

    // Set a nested value, coercing the leaf by key name
    const setNested = (obj: any, path: string[], value: any) => {
      let cur = obj;
      for (let i = 0; i < path.length - 1; i++) {
        if (!cur[path[i]] || typeof cur[path[i]] !== 'object') cur[path[i]] = {};
        cur = cur[path[i]];
      }
      const lastKey = path[path.length - 1];
      cur[lastKey] = coerce(lastKey, value);
    };

    const lineItem: any = {};
    const taxItem: any = {};

    Object.entries(row).forEach(([key, value]) => {
      if (!key || value === undefined || value === null || String(value).trim() === '') return;

      // ── Flat dot-notation headers (e.g. invoice_line.item.name) ───────────
      if (key.startsWith('invoice_line.')) {
        const path = key.replace('invoice_line.', '').split('.').filter(Boolean);
        setNested(lineItem, path, value);
        return;
      }
      if (key.startsWith('tax_total.')) {
        const path = key.replace('tax_total.', '').split('.').filter(Boolean);
        setNested(taxItem, path, value);
        return;
      }
      if (key.includes('.')) {
        const path = key.split('.').filter(Boolean);
        setNested(payload, path, value);
        return;
      }

      // ── Try to parse as JSON object (handles malformed/truncated JSON) ─────
      if (typeof value === 'string' || (typeof value === 'object' && value !== null)) {
        const parsed = tryParseJson(value);
        if (parsed) {
          if (key === 'invoice_line' || key === 'tax_total') {
            payload[key] = Array.isArray(parsed) ? parsed : [parsed];
          } else {
            payload[key] = parsed;
          }
          return;
        }
      }

      // ── Known array/object fields with plain scalar values ─────────────────
      if (key === 'invoice_line') {
        payload.invoice_line = [{ item: { description: String(value) } }];
        return;
      }
      if (key === 'tax_total') {
        const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) payload.tax_total = [{ tax_amount: num }];
        return;
      }
      if (key === 'legal_monetary_total') {
        const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) payload.legal_monetary_total = { payable_amount: num };
        return;
      }

      // ── Plain field — coerce by key name ───────────────────────────────────
      payload[key] = coerce(key, value);
    });

    if (Object.keys(lineItem).length > 0) payload.invoice_line = [lineItem];
    if (Object.keys(taxItem).length > 0) payload.tax_total = [taxItem];

    // Guarantee these are always strings when present
    if (payload.invoice_type_code != null) payload.invoice_type_code = String(payload.invoice_type_code).replace(/\.0$/, '').trim();
    if (payload.document_currency_code != null) payload.document_currency_code = String(payload.document_currency_code).replace(/\.0$/, '').trim();
    if (payload.tax_currency_code != null) payload.tax_currency_code = String(payload.tax_currency_code).replace(/\.0$/, '').trim();
    if (payload.invoice_number) {
      payload.invoice_number = String(payload.invoice_number).replace(/\.0$/, '').trim();
    }

    // Remove payment_means if empty — causes API errors
    if (!payload.payment_means?.length) delete payload.payment_means;

    return payload;
  };

  const handleBulkUpload = async (token: string) => {
   

    const payload = rows.map((row)=> sanitizePayloadForApi(buildPayload(row)));

    const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const jsonFile = new File([jsonBlob], 'payload.json', { type: 'application/json' });
    const formData = new FormData();
formData.append('file', jsonFile);

    console.log('📤 Bulk uploading file:', file!.name);

    const res = await fetch(API_END_POINT.INVOICE.CREAT_INVOICE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const text = await res.text();

    if (res.ok) {
      setUploadStatus('success');
      addToast({ variant: 'success', title: 'Bulk Upload Successful', description: `${rows.length} invoices uploaded.` });
      onUploadSuccess();
      setTimeout(() => onOpenChange(false), 1500);
    } else {
      let msg = text;
      try {
        const errJson = JSON.parse(text);
        if (typeof errJson.message === 'string' && errJson.message) {
          msg = errJson.message;
        } else if (typeof errJson.error === 'string' && errJson.error) {
          msg = errJson.error;
        } else if (errJson.error && typeof errJson.error.message === 'string') {
          msg = errJson.error.message;
        } else if (typeof errJson.detail === 'string' && errJson.detail) {
          msg = errJson.detail;
        } else {
          msg = JSON.stringify(errJson);
        }
      } catch {
        // leave msg as raw text
      }
      console.error('❌ Bulk upload failed:', text);
      setUploadStatus('failed');
      setErrorMessage(msg || 'Bulk upload failed.');
    }
  };

  const handleSingleUpload = async (token: string) => {
    const raw = buildPayload(rows[0]);
    const payload = sanitizePayloadForApi(raw);
    console.log('📤 Uploading payload:', JSON.stringify(payload, null, 2));

    const res = await fetch(API_END_POINT.INVOICE.UPLOAD_INVOICE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();

    if (res.ok) {
      setUploadStatus('success');
      addToast({ variant: 'success', title: 'Upload Successful', description: 'Invoice uploaded.' });
      onUploadSuccess();
      setTimeout(() => onOpenChange(false), 1500);
    } else {
      let msg = text;
      let status: 'error' | 'failed' | 'partial_success' = 'failed';
      try {
        const errJson = JSON.parse(text);
        const errObj = errJson.error;
        const statusCode = errJson.status_code;

        // 422 = validation error — show field-level errors
        if (statusCode === 422 && errObj && typeof errObj === 'object' && !Array.isArray(errObj)) {
          status = 'error';
          const lines = Object.entries(errObj).map(([field, m]) => `${field}: ${m}`);
          msg = errJson.message + '\n\n' + lines.join('\n');
        }
        // 400 with metadata — backend tells us which steps succeeded/failed
        else if (statusCode === 400 && errObj && typeof errObj === 'object' && Array.isArray((errObj as { metadata?: unknown }).metadata)) {
          const metadata = (errObj as { metadata: { step?: string; status?: string }[] }).metadata;
          const succeeded = metadata.filter((s) => s.status === 'success').map((s) => s.step).filter(Boolean);
          const failedSteps = metadata.filter((s) => s.status === 'failed').map((s) => s.step).filter(Boolean);
          if (succeeded.length > 0 && failedSteps.length > 0) {
            status = 'partial_success';
            msg = `Invoice has been transmitted to NRIS. Succeeded: ${succeeded.join(', ')}. Failed at: ${failedSteps.join(', ')}. ${errJson.message || ''}`.trim();
          } else {
            status = 'failed';
            msg = errJson.message || (failedSteps.length ? `Failed at: ${failedSteps.join(', ')}` : '') || JSON.stringify(errObj) || text;
          }
        } else {
          msg = errJson.message || (typeof errObj === 'object' ? JSON.stringify(errObj) : String(errObj)) || text;
        }
      } catch {
        // leave msg as text, status as 'failed'
      }
      setUploadStatus(status);
      setErrorMessage(msg || 'Upload failed.');
      console.error('❌ Upload failed:', text);
    }
  };

  const handleUpload = async () => {
    if (!file || !rows.length) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setUploadStatus('error');
      setErrorMessage('Please log in to upload invoices.');
      return;
    }

    setUploading(true);
    setUploadStatus('pending');
    setErrorMessage('');

    try {
      if (rows.length > 1) {
        await handleBulkUpload(token);
      } else {
        await handleSingleUpload(token);
      }
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage('Network error. Please try again.');
      console.error('❌ Network error:', err);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setRows([]);
    setHeaders([]);
    setUploadStatus('idle');
    setErrorMessage('');
    const input = document.getElementById('file-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] flex flex-col bg-white text-slate-900 overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Upload Invoice</DialogTitle>
          <DialogDescription>
            Select an Excel or CSV file and click Upload to send it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
          {uploadStatus === 'success' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <p className="text-sm text-emerald-900">Invoice uploaded successfully.</p>
            </div>
          )}
          {uploadStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 min-h-0 overflow-hidden">
              <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-red-900">Validation error</p>
                <p className="text-sm text-red-900 break-words overflow-y-auto max-h-[40vh] mt-1">{errorMessage}</p>
              </div>
            </div>
          )}
          {uploadStatus === 'partial_success' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">Partial success</p>
                <p className="text-sm text-amber-900 break-words mt-1">Your invoice has been transmitted to NRIS. Please check the status on your dashboard.</p>
              </div>
            </div>
          )}
          {uploadStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="size-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Upload failed</p>
                <p className="text-sm text-red-900 break-words mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {!file ? (
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <FileSpreadsheet className="size-10 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Click to select file</span>
                <span className="text-xs text-slate-500">Supports .xlsx, .xls, .csv</span>
              </label>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-4 flex items-center gap-3">
              <FileSpreadsheet className="size-8 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">
                  {headers.length} columns · {rows.length} row{rows.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="size-4" />
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            {(uploadStatus === 'success' || uploadStatus === 'error' || uploadStatus === 'failed' || uploadStatus === 'partial_success') ? (
              <Button
                onClick={() => {
                  onUploadSuccess();
                  onOpenChange(false);
                }}
                className="flex-1"
              >
                <LayoutDashboard className="size-4 mr-2" />
                Return to dashboard
              </Button>
            ) : (
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="flex-1"
              >
                {uploading || uploadStatus === 'pending' ? (
                  'Uploading...'
                ) : (
                  <><Upload className="size-4 mr-2" />Upload</>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}