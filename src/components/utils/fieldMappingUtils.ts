import type { FieldMapping } from '../FieldMappingDialog';

// Invoice field type definition
export type InvoiceField = {
  value: string;
  label: string;
  required: boolean;
  category: string;
};

// Invoice data structure fields based on invoice-data (1).json
export const INVOICE_FIELDS: InvoiceField[] = [
  // Basic invoice fields
  { value: 'invoice_number', label: 'Invoice Number', required: true, category: 'Basic' },
  { value: 'business_id', label: 'Business ID', required: false, category: 'Basic' },
  { value: 'irn', label: 'IRN', required: false, category: 'Basic' },
  { value: 'issue_date', label: 'Issue Date', required: true, category: 'Basic' },
  { value: 'due_date', label: 'Due Date', required: true, category: 'Basic' },
  { value: 'invoice_type_code', label: 'Invoice Type Code', required: false, category: 'Basic' },
  { value: 'note', label: 'Note', required: false, category: 'Basic' },
  { value: 'tax_point_date', label: 'Tax Point Date', required: false, category: 'Basic' },
  { value: 'document_currency_code', label: 'Document Currency Code', required: false, category: 'Basic' },
  { value: 'tax_currency_code', label: 'Tax Currency Code', required: false, category: 'Basic' },
  { value: 'accounting_cost', label: 'Accounting Cost', required: false, category: 'Basic' },
  { value: 'buyer_reference', label: 'Buyer Reference', required: false, category: 'Basic' },
  { value: 'order_reference', label: 'Order Reference', required: false, category: 'Basic' },
  { value: 'actual_delivery_date', label: 'Actual Delivery Date', required: false, category: 'Basic' },
  { value: 'payment_terms_note', label: 'Payment Terms Note', required: false, category: 'Basic' },
  
  // Invoice delivery period
  { value: 'invoice_delivery_period.start_date', label: 'Delivery Period Start Date', required: false, category: 'Delivery' },
  { value: 'invoice_delivery_period.end_date', label: 'Delivery Period End Date', required: false, category: 'Delivery' },
  
  // Supplier party fields
  { value: 'accounting_supplier_party.party_name', label: 'Supplier Party Name', required: true, category: 'Supplier' },
  { value: 'accounting_supplier_party.tin', label: 'Supplier TIN', required: true, category: 'Supplier' },
  { value: 'accounting_supplier_party.email', label: 'Supplier Email', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.telephone', label: 'Supplier Telephone', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.business_description', label: 'Supplier Business Description', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.street_name', label: 'Supplier Street Name', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.city_name', label: 'Supplier City', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.postal_zone', label: 'Supplier Postal Zone', required: false, category: 'Supplier' },
  { value: 'accounting_supplier_party.postal_address.country', label: 'Supplier Country', required: false, category: 'Supplier' },
  
  // Customer party fields
  { value: 'accounting_customer_party.id', label: 'Customer ID', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.party_name', label: 'Customer Party Name', required: true, category: 'Customer' },
  { value: 'accounting_customer_party.tin', label: 'Customer TIN', required: true, category: 'Customer' },
  { value: 'accounting_customer_party.email', label: 'Customer Email', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.telephone', label: 'Customer Telephone', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.business_description', label: 'Customer Business Description', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.street_name', label: 'Customer Street Name', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.city_name', label: 'Customer City', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.postal_zone', label: 'Customer Postal Zone', required: false, category: 'Customer' },
  { value: 'accounting_customer_party.postal_address.country', label: 'Customer Country', required: false, category: 'Customer' },
  
  // Monetary totals
  { value: 'legal_monetary_total.line_extension_amount', label: 'Line Extension Amount', required: false, category: 'Monetary' },
  { value: 'legal_monetary_total.tax_exclusive_amount', label: 'Tax Exclusive Amount', required: false, category: 'Monetary' },
  { value: 'legal_monetary_total.tax_inclusive_amount', label: 'Tax Inclusive Amount', required: false, category: 'Monetary' },
  { value: 'legal_monetary_total.payable_amount', label: 'Payable Amount', required: true, category: 'Monetary' },
  
  // Invoice line items
  { value: 'invoice_line[].hsn_code', label: 'HSN Code', required: false, category: 'Line Items' },
  { value: 'invoice_line[].product_category', label: 'Product Category', required: false, category: 'Line Items' },
  { value: 'invoice_line[].item.name', label: 'Item Name', required: true, category: 'Line Items' },
  { value: 'invoice_line[].item.description', label: 'Item Description', required: false, category: 'Line Items' },
  { value: 'invoice_line[].item.sellers_item_identification', label: 'Seller Item Identification', required: false, category: 'Line Items' },
  { value: 'invoice_line[].invoiced_quantity', label: 'Invoiced Quantity', required: true, category: 'Line Items' },
  { value: 'invoice_line[].price.price_amount', label: 'Price Amount', required: true, category: 'Line Items' },
  { value: 'invoice_line[].price.base_quantity', label: 'Base Quantity', required: false, category: 'Line Items' },
  { value: 'invoice_line[].price.price_unit', label: 'Price Unit', required: false, category: 'Line Items' },
  { value: 'invoice_line[].line_extension_amount', label: 'Line Extension Amount', required: false, category: 'Line Items' },
  { value: 'invoice_line[].dicount_rate', label: 'Discount Rate', required: false, category: 'Line Items' },
  { value: 'invoice_line[].dicount_amount', label: 'Discount Amount', required: false, category: 'Line Items' },
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

