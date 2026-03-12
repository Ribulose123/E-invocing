import type { FieldMapping } from '../modals/FieldMappingDialog';

// Invoice field type definition
export type InvoiceField = {
  value: string;
  label: string;
  required: boolean;
  category: string;
};

/**
 * Auto-mapping dictionary: Common Excel header names → API field paths
 * This enables automatic header detection and reduces manual mapping by 90%
 */
export const AUTO_FIELD_MAP: Record<string, string> = {
  // Invoice Number variations
  'invoice number': 'invoice_number',
  'invoice no': 'invoice_number',
  'invoice no.': 'invoice_number',
  'invoice #': 'invoice_number',
  'inv number': 'invoice_number',
  'inv no': 'invoice_number',
  
  // Business ID variations
  'business id': 'business_id',
  'businessid': 'business_id',
  'business_id': 'business_id',
  
  // Issue Date variations
  'issue date': 'issue_date',
  'invoice date': 'issue_date',
  'date': 'issue_date',
  'invoice date issued': 'issue_date',
  
  // Due Date variations
  'due date': 'due_date',
  'payment due date': 'due_date',
  'due': 'due_date',
  
  // Supplier Party variations
  'supplier name': 'accounting_supplier_party.party_name',
  'supplier': 'accounting_supplier_party.party_name',
  'vendor name': 'accounting_supplier_party.party_name',
  'vendor': 'accounting_supplier_party.party_name',
  'supplier email': 'accounting_supplier_party.email',
  'vendor email': 'accounting_supplier_party.email',
  'supplier tin': 'accounting_supplier_party.tin',
  'vendor tin': 'accounting_supplier_party.tin',
  'tin': 'accounting_supplier_party.tin',
  'supplier telephone': 'accounting_supplier_party.telephone',
  'supplier phone': 'accounting_supplier_party.telephone',
  'supplier address': 'accounting_supplier_party.postal_address.street_name',
  'supplier street': 'accounting_supplier_party.postal_address.street_name',
  'supplier city': 'accounting_supplier_party.postal_address.city_name',
  'supplier country': 'accounting_supplier_party.postal_address.country',
  'supplier state': 'accounting_supplier_party.postal_address.state',
  'supplier lga': 'accounting_supplier_party.postal_address.lga',
  'supplier postal zone': 'accounting_supplier_party.postal_address.postal_zone',
  
  // Customer Party variations
  'customer name': 'accounting_customer_party.party_name',
  'customer': 'accounting_customer_party.party_name',
  'buyer name': 'accounting_customer_party.party_name',
  'client name': 'accounting_customer_party.party_name',
  'customer email': 'accounting_customer_party.email',
  'customer tin': 'accounting_customer_party.tin',
  'customer telephone': 'accounting_customer_party.telephone',
  'customer phone': 'accounting_customer_party.telephone',
  'customer address': 'accounting_customer_party.postal_address.street_name',
  'customer street': 'accounting_customer_party.postal_address.street_name',
  'customer city': 'accounting_customer_party.postal_address.city_name',
  'customer country': 'accounting_customer_party.postal_address.country',
  'customer state': 'accounting_customer_party.postal_address.state',
  'customer lga': 'accounting_customer_party.postal_address.lga',
  'customer postal zone': 'accounting_customer_party.postal_address.postal_zone',
  
  // Invoice Line Items variations
  'item': 'invoice_line[].item.name',
  'item name': 'invoice_line[].item.name',
  'product': 'invoice_line[].item.name',
  'product name': 'invoice_line[].item.name',
  'description': 'invoice_line[].item.description',
  'item description': 'invoice_line[].item.description',
  'product description': 'invoice_line[].item.description',
  'quantity': 'invoice_line[].invoiced_quantity',
  'qty': 'invoice_line[].invoiced_quantity',
  'qty.': 'invoice_line[].invoiced_quantity',
  'price': 'invoice_line[].price.price_amount',
  'unit price': 'invoice_line[].price.price_amount',
  'price per unit': 'invoice_line[].price.price_amount',
  'unit cost': 'invoice_line[].price.price_amount',
  'total': 'invoice_line[].line_extension_amount',
  'line total': 'invoice_line[].line_extension_amount',
  'amount': 'invoice_line[].line_extension_amount',
  'line amount': 'invoice_line[].line_extension_amount',
  'hsn code': 'invoice_line[].hsn_code',
  'hsn': 'invoice_line[].hsn_code',
  'product category': 'invoice_line[].product_category',
  'category': 'invoice_line[].product_category',
  
  // Monetary Totals variations
  'payable amount': 'legal_monetary_total.payable_amount',
  'total amount': 'legal_monetary_total.payable_amount',
  'grand total': 'legal_monetary_total.payable_amount',
  'tax exclusive amount': 'legal_monetary_total.tax_exclusive_amount',
  'subtotal': 'legal_monetary_total.tax_exclusive_amount',
  'tax inclusive amount': 'legal_monetary_total.tax_inclusive_amount',
  'total with tax': 'legal_monetary_total.tax_inclusive_amount',
  'line extension amount': 'legal_monetary_total.line_extension_amount',
  
  // Currency variations
  'currency': 'document_currency_code',
  'document currency': 'document_currency_code',
  'currency code': 'document_currency_code',
  'tax currency': 'tax_currency_code',
  
  // Invoice Type variations
  'invoice type': 'invoice_type_code',
  'type': 'invoice_type_code',
  'invoice type code': 'invoice_type_code',
  
  // Tax variations
  'tax amount': 'tax_total[].tax_amount',
  'total tax': 'tax_total[].tax_amount',
  'tax': 'tax_total[].tax_amount',
  'vat': 'tax_total[].tax_amount',
  'tax percent': 'tax_total[].tax_subtotal[].tax_category.percent',
  'tax rate': 'tax_total[].tax_subtotal[].tax_category.percent',
  'tax category': 'tax_total[].tax_subtotal[].tax_category.id',
};

/**
 * Normalizes header name for auto-mapping lookup
 * Removes special characters, converts to lowercase, trims whitespace
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Auto-maps Excel headers to invoice fields using the AUTO_FIELD_MAP dictionary
 * @param headers - Array of Excel header names
 * @param existingMappings - Existing mappings to preserve
 * @returns Auto-mapped field mappings
 */
export function autoMapHeaders(
  headers: string[],
  existingMappings: FieldMapping = {}
): FieldMapping {
  const mappings: FieldMapping = { ...existingMappings };
  
  for (const header of headers) {
    // Skip if already mapped
    if (mappings[header] && mappings[header] !== 'skip') {
      continue;
    }
    
    // Normalize header and check auto-map dictionary
    const normalized = normalizeHeader(header);
    
    if (AUTO_FIELD_MAP[normalized]) {
      mappings[header] = AUTO_FIELD_MAP[normalized];
    }
  }
  
  return mappings;
}

// Invoice data structure fields based on invoice-data (1).json
export const INVOICE_FIELDS: InvoiceField[] = [
  // Basic invoice fields - Only top-level required fields
  { value: 'invoice_number', label: 'Invoice Number', required: true, category: 'Basic' },
  { value: 'business_id', label: 'Business ID', required: false, category: 'Basic' }, // Can be mapped from Excel, defaults to user's business_id if not mapped
  { value: 'issue_date', label: 'Issue Date', required: true, category: 'Basic' },
  { value: 'invoice_type_code', label: 'Invoice Type Code', required: true, category: 'Basic' },
  { value: 'document_currency_code', label: 'Document Currency Code', required: true, category: 'Basic' },
  { value: 'tax_currency_code', label: 'Tax Currency Code', required: true, category: 'Basic' },
  
  // Optional basic fields
  { value: 'irn', label: 'IRN', required: false, category: 'Basic' },
  { value: 'due_date', label: 'Due Date', required: false, category: 'Basic' },
  { value: 'note', label: 'Note', required: false, category: 'Basic' },
  { value: 'tax_point_date', label: 'Tax Point Date', required: false, category: 'Basic' },
  { value: 'accounting_cost', label: 'Accounting Cost', required: false, category: 'Basic' },
  { value: 'buyer_reference', label: 'Buyer Reference', required: false, category: 'Basic' },
  { value: 'order_reference', label: 'Order Reference', required: false, category: 'Basic' },
  { value: 'actual_delivery_date', label: 'Actual Delivery Date', required: false, category: 'Basic' },
  { value: 'payment_terms_note', label: 'Payment Terms Note', required: false, category: 'Basic' },
  
  // Invoice delivery period
  { value: 'invoice_delivery_period.start_date', label: 'Delivery Period Start Date', required: false, category: 'Delivery' },
  { value: 'invoice_delivery_period.end_date', label: 'Delivery Period End Date', required: false, category: 'Delivery' },
  
  // Supplier party fields - postal_address fields are required by API
  { value: 'accounting_supplier_party.party_name', label: 'Supplier Party Name', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.tin', label: 'Supplier TIN', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.email', label: 'Supplier Email', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.telephone', label: 'Supplier Telephone', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.business_description', label: 'Supplier Business Description', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.street_name', label: 'Supplier Street Name', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.city_name', label: 'Supplier City', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.postal_zone', label: 'Supplier Postal Zone', required: true, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.country', label: 'Supplier Country', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.state', label: 'Supplier State', required: true, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.lga', label: 'Supplier LGA', required: true, category: 'Supplier' },
  
  // Customer party fields - postal_address fields are required by API
  { value: 'accounting_customer_party.id', label: 'Customer ID', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.party_name', label: 'Customer Party Name', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.tin', label: 'Customer TIN', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.email', label: 'Customer Email', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.telephone', label: 'Customer Telephone', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.business_description', label: 'Customer Business Description', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.street_name', label: 'Customer Street Name', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.city_name', label: 'Customer City', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.postal_zone', label: 'Customer Postal Zone', required: true, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.country', label: 'Customer Country', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.state', label: 'Customer State', required: true, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.lga', label: 'Customer LGA', required: true, category: 'Customer' },
  
  // Monetary totals - All optional (top-level legal_monetary_total is required conceptually)
  { value: 'legal_monetary_total.line_extension_amount', label: 'Line Extension Amount', required: false, category: 'Monetary' },
  { value: 'legal_monetary_total.tax_exclusive_amount', label: 'Tax Exclusive Amount', required: false, category: 'Monetary' },
  { value: 'legal_monetary_total.tax_inclusive_amount', label: 'Tax Inclusive Amount', required: false, category: 'Monetary' },
  { value: 'legal_monetary_total.payable_amount', label: 'Payable Amount', required: false, category: 'Monetary' },
  
  // Tax total - All optional
  { value: 'tax_total[].tax_amount', label: 'Tax Amount', required: false, category: 'Tax' },
  { value: 'tax_total[].tax_subtotal[].tax_amount', label: 'Tax Subtotal Amount', required: false, category: 'Tax' },
  { value: 'tax_total[].tax_subtotal[].taxable_amount', label: 'Taxable Amount', required: false, category: 'Tax' },
  { value: 'tax_total[].tax_subtotal[].tax_category.id', label: 'Tax Category ID', required: false, category: 'Tax' },
  { value: 'tax_total[].tax_subtotal[].tax_category.percent', label: 'Tax Category Percent', required: false, category: 'Tax' },
  
  // Invoice line items - price.price_amount and line_extension_amount are required by API
  { value: 'invoice_line[].hsn_code', label: 'HSN Code', required: false, category: 'Line Items' },
  { value: 'invoice_line[].product_category', label: 'Product Category', required: false, category: 'Line Items' },
  { value: 'invoice_line[].item.name', label: 'Item Name', required: false, category: 'Line Items' },
  { value: 'invoice_line[].item.description', label: 'Item Description', required: true, category: 'Line Items' },
  { value: 'invoice_line[].item.sellers_item_identification', label: 'Seller Item Identification', required: false, category: 'Line Items' },
  { value: 'invoice_line[].invoiced_quantity', label: 'Invoiced Quantity', required: false, category: 'Line Items' },
  { value: 'invoice_line[].price.price_amount', label: 'Price Amount', required: true, category: 'Line Items' },
  { value: 'invoice_line[].price.base_quantity', label: 'Base Quantity', required: false, category: 'Line Items' },
  { value: 'invoice_line[].price.price_unit', label: 'Price Unit', required: false, category: 'Line Items' },
  { value: 'invoice_line[].line_extension_amount', label: 'Line Extension Amount', required: true, category: 'Line Items' },
  { value: 'invoice_line[].discount_rate', label: 'Discount Rate', required: false, category: 'Line Items' },
  { value: 'invoice_line[].discount_amount', label: 'Discount Amount', required: false, category: 'Line Items' },
  { value: 'invoice_line[].fee_rate', label: 'Fee Rate', required: false, category: 'Line Items' },
  { value: 'invoice_line[].fee_amount', label: 'Fee Amount', required: false, category: 'Line Items' },
];

/**
 * Calculates the similarity score between two strings using Levenshtein distance
 * Returns a value between 0 (completely different) and 1 (identical)
 * @param str1 - First string to compare
 * @param str2 - Second string to compare
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matrix: number[][] = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - matrix[s2.length][s1.length] / maxLength;
}

/**
 * Finds the best matching invoice field for a given header name
 * Uses fuzzy matching to suggest the most likely field
 * @param headerName - The Excel header name to match
 * @param excludeFields - Array of field values to exclude from suggestions
 * @returns The best matching invoice field or null if no good match found
 */
export function findBestMatch(
  headerName: string,
  excludeFields: string[] = []
): { field: InvoiceField; score: number } | null {
  const headerLower = headerName.toLowerCase().replace(/[_\s-]/g, '');
  let bestMatch: { field: typeof INVOICE_FIELDS[0]; score: number } | null = null;
  let bestScore = 0.3; // Minimum threshold for suggestions
  
  for (const field of INVOICE_FIELDS) {
    if (excludeFields.includes(field.value)) continue;
    
    const labelLower = field.label.toLowerCase().replace(/[_\s-]/g, '');
    const valueLower = field.value.toLowerCase().replace(/[_\s-]/g, '');
    
    // Check exact matches first
    if (headerLower === labelLower || headerLower === valueLower) {
      return { field, score: 1 };
    }
    
    // Check if header contains field name or vice versa
    if (headerLower.includes(labelLower) || labelLower.includes(headerLower)) {
      const score = 0.8;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = { field, score };
      }
      continue;
    }
    
    // Calculate similarity score
    const labelScore = calculateSimilarity(headerLower, labelLower);
    const valueScore = calculateSimilarity(headerLower, valueLower);
    const score = Math.max(labelScore, valueScore);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { field, score };
    }
  }
  
  return bestMatch;
}

/**
 * Gets suggested mappings for all headers based on fuzzy matching
 * @param headers - Array of Excel header names
 * @param existingMappings - Current mappings to exclude from suggestions
 * @returns Map of header names to suggested invoice fields
 */
export function getSuggestedMappings(
  headers: string[],
  existingMappings: FieldMapping
): Map<string, { field: InvoiceField; score: number }> {
  const suggestions = new Map();
  const mappedFields = Object.values(existingMappings);
  
  for (const header of headers) {
    if (existingMappings[header]) continue; // Skip already mapped headers
    
    const match = findBestMatch(header, mappedFields);
    if (match && match.score >= 0.3) {
      suggestions.set(header, match);
    }
  }
  
  return suggestions;
}

/**
 * Calculates mapping progress statistics
 * @param headers - Array of all Excel headers
 * @param mappings - Current field mappings
 * @returns Object containing progress statistics
 */
export function calculateProgress(
  headers: string[],
  mappings: FieldMapping
): {
  total: number;
  mapped: number;
  unmapped: number;
  requiredMapped: number;
  requiredTotal: number;
  progressPercent: number;
} {
  const total = headers.length;
  const mapped = Object.keys(mappings).filter(
    (header) => mappings[header] && mappings[header] !== 'skip'
  ).length;
  const unmapped = total - mapped;
  
  const requiredFields = INVOICE_FIELDS.filter((f) => f.required);
  const requiredTotal = requiredFields.length;
  const mappedFields = Object.values(mappings);
  const requiredMapped = requiredFields.filter((f) =>
    mappedFields.includes(f.value)
  ).length;
  
  const progressPercent = requiredTotal > 0
    ? Math.round((requiredMapped / requiredTotal) * 100)
    : 0;
  
  return {
    total,
    mapped,
    unmapped,
    requiredMapped,
    requiredTotal,
    progressPercent,
  };
}

/**
 * Filters headers based on search term and status
 * @param headers - Array of all headers
 * @param searchTerm - Search query string
 * @param mappings - Current mappings
 * @param filter - Filter type: 'all', 'mapped', 'unmapped', 'required'
 * @returns Filtered array of headers
 */
export function filterHeaders(
  headers: string[],
  searchTerm: string,
  mappings: FieldMapping,
  filter: 'all' | 'mapped' | 'unmapped' | 'required' = 'all'
): string[] {
  let filtered = headers;
  
  // Apply status filter
  if (filter === 'mapped') {
    filtered = filtered.filter((h) => mappings[h] && mappings[h] !== 'skip');
  } else if (filter === 'unmapped') {
    filtered = filtered.filter((h) => !mappings[h] || mappings[h] === 'skip');
  } else if (filter === 'required') {
    const requiredFields = INVOICE_FIELDS.filter((f) => f.required);
    const requiredValues = requiredFields.map((f) => f.value);
    filtered = filtered.filter((h) => {
      const mapping = mappings[h];
      return mapping && requiredValues.includes(mapping);
    });
  }
  
  // Apply search filter
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter((header) =>
      header.toLowerCase().includes(searchLower)
    );
  }
  
  return filtered;
}

/**
 * Sorts headers based on the specified sort order
 * @param headers - Array of headers to sort
 * @param mappings - Current mappings
 * @param sortOrder - Sort order: 'original', 'alphabetical', 'mapped-first', 'unmapped-first'
 * @param originalOrder - Original order of headers for reference
 * @returns Sorted array of headers
 */
export function sortHeaders(
  headers: string[],
  mappings: FieldMapping,
  sortOrder: 'original' | 'alphabetical' | 'mapped-first' | 'unmapped-first',
  originalOrder: string[]
): string[] {
  const sorted = [...headers];
  
  switch (sortOrder) {
    case 'alphabetical':
      return sorted.sort((a, b) => a.localeCompare(b));
    
    case 'mapped-first':
      return sorted.sort((a, b) => {
        const aMapped = !!(mappings[a] && mappings[a] !== 'skip');
        const bMapped = !!(mappings[b] && mappings[b] !== 'skip');
        if (aMapped === bMapped) return 0;
        return aMapped ? -1 : 1;
      });
    
    case 'unmapped-first':
      return sorted.sort((a, b) => {
        const aMapped = !!(mappings[a] && mappings[a] !== 'skip');
        const bMapped = !!(mappings[b] && mappings[b] !== 'skip');
        if (aMapped === bMapped) return 0;
        return aMapped ? 1 : -1;
      });
    
    case 'original':
    default:
      return sorted.sort((a, b) => {
        const indexA = originalOrder.indexOf(a);
        const indexB = originalOrder.indexOf(b);
        return indexA - indexB;
      });
  }
}

/**
 * Filters invoice fields based on search term
 * @param searchTerm - Search query string
 * @returns Filtered array of invoice fields
 */
export function filterInvoiceFields(searchTerm: string): InvoiceField[] {
  if (!searchTerm.trim()) return INVOICE_FIELDS;
  
  const searchLower = searchTerm.toLowerCase();
  return INVOICE_FIELDS.filter(
    (field) =>
      field.label.toLowerCase().includes(searchLower) ||
      field.value.toLowerCase().includes(searchLower) ||
      field.category.toLowerCase().includes(searchLower)
  );
}

/**
 * Groups invoice fields by category
 * @param fields - Array of invoice fields to group
 * @returns Object mapping category names to arrays of fields
 */
export function groupFieldsByCategory(
  fields: InvoiceField[]
): Record<string, InvoiceField[]> {
  return fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, InvoiceField[]>);
}

/**
 * Gets field description/tooltip text for a given invoice field
 * @param fieldValue - The invoice field value
 * @returns Description string or null if not found
 */
export function getFieldDescription(fieldValue: string): string | null {
  const field = INVOICE_FIELDS.find((f) => f.value === fieldValue);
  if (!field) return null;
  
  // Add descriptions based on field type
  const descriptions: Record<string, string> = {
    'issue_date': 'The date when the invoice was issued (format: YYYY-MM-DD)',
    'due_date': 'The date when payment is due (format: YYYY-MM-DD)',
    'accounting_supplier_party.party_name': 'The name of the supplier/vendor company',
    'accounting_supplier_party.tin': 'Tax Identification Number of the supplier',
    'accounting_customer_party.party_name': 'The name of the customer/client company',
    'accounting_customer_party.tin': 'Tax Identification Number of the customer',
    'legal_monetary_total.payable_amount': 'Total amount payable (including taxes)',
    'invoice_line[].item.name': 'Name of the product or service',
    'invoice_line[].invoiced_quantity': 'Quantity of items (numeric value)',
    'invoice_line[].price.price_amount': 'Unit price of the item (numeric value)',
  };
  
  return descriptions[fieldValue] || `Maps to ${field.label} field`;
}

/**
 * Checks if a header is mapped to a required field
 * @param header - Header name to check
 * @param mappings - Current mappings
 * @returns True if mapped to a required field
 */
export function isMappedToRequired(
  header: string,
  mappings: FieldMapping
): boolean {
  const mapping = mappings[header];
  if (!mapping || mapping === 'skip') return false;
  
  const field = INVOICE_FIELDS.find((f) => f.value === mapping);
  return field?.required || false;
}

/**
 * Gets all unmapped required fields
 * @param mappings - Current mappings
 * @returns Array of unmapped required invoice fields
 */
export function getUnmappedRequiredFields(
  mappings: FieldMapping
): InvoiceField[] {
  const mappedFields = Object.values(mappings);
  return INVOICE_FIELDS.filter(
    (field) => field.required && !mappedFields.includes(field.value)
    // Note: business_id can now be mapped/unmapped, but defaults to user's business_id if not mapped
  );
}

/**
 * Validates if all required fields are mapped
 * @param mappings - Current mappings
 * @returns True if all required fields are mapped
 */
export function validateRequiredMappings(mappings: FieldMapping): boolean {
  const unmappedRequired = getUnmappedRequiredFields(mappings);
  return unmappedRequired.length === 0;
}

/**
 * Validates an invoice object to check if required fields are present
 * @param invoice - Invoice object to validate
 * @returns Object with isValid flag and missingFields array
 */
export function validateInvoice(invoice: any): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields = [
    'invoice_number',
    'issue_date',
    'invoice_type_code',
    'document_currency_code',
    'tax_currency_code',
    'accounting_supplier_party',
    'legal_monetary_total',
    'invoice_line',
    'tax_total'
  ];
  
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    const keys = field.split('.');
    let current = invoice;
    let found = true;
    
    for (const key of keys) {
      if (current?.[key] === undefined || current?.[key] === null || current?.[key] === '') {
        found = false;
        break;
      }
      current = current[key];
    }
    
    // Special checks for arrays and objects
    if (found) {
      if (field === 'invoice_line' && (!Array.isArray(current) || current.length === 0)) {
        found = false;
      } else if (field === 'tax_total' && (!Array.isArray(current) || current.length === 0)) {
        found = false;
      } else if (field === 'accounting_supplier_party' && typeof current !== 'object') {
        found = false;
      } else if (field === 'legal_monetary_total' && typeof current !== 'object') {
        found = false;
      }
    }
    
    if (!found) {
      missingFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

