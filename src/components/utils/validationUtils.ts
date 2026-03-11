

import type { FieldMapping } from '../modals/FieldMappingDialog';
import { INVOICE_FIELDS, type InvoiceField } from './fieldMappingUtils';

// Validation result types
export type ValidationError = {
  type: 'error' | 'warning';
  row?: number; 
  field?: string;
  message: string;
  suggestion?: string;
  value?: any; 
};

export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
};

// Field type definitions for validation
export type FieldType = 'string' | 'number' | 'date' | 'currency_code' | 'email' | 'tin' | 'invoice_type_code';

export type FieldSchema = {
  field: string;
  type: FieldType;
  required: boolean;
  format?: RegExp;
  min?: number;
  max?: number;
  allowedValues?: string[];
};

// Validation schema based on API requirements
export const FIELD_SCHEMA: Record<string, FieldSchema> = {
  // Basic fields
  'invoice_number': {
    field: 'invoice_number',
    type: 'string',
    required: true,
    format: /^.+$/ // Non-empty string
  },
  'issue_date': {
    field: 'issue_date',
    type: 'date',
    required: true,
    format: /^\d{4}-\d{2}-\d{2}$/
  },
  'invoice_type_code': {
    field: 'invoice_type_code',
    type: 'invoice_type_code',
    required: true,
    allowedValues: ['381', '382', '383', '384', '385', '386', '387', '388', '389', '390']
  },
  'document_currency_code': {
    field: 'document_currency_code',
    type: 'currency_code',
    required: true,
    format: /^[A-Z]{3}$/
  },
  'tax_currency_code': {
    field: 'tax_currency_code',
    type: 'currency_code',
    required: true,
    format: /^[A-Z]{3}$/
  },
  
  // Supplier party fields
  'accounting_supplier_party.party_name': {
    field: 'accounting_supplier_party.party_name',
    type: 'string',
    required: true
  },
  'accounting_supplier_party.email': {
    field: 'accounting_supplier_party.email',
    type: 'email',
    required: true,
    format: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  'accounting_supplier_party.tin': {
    field: 'accounting_supplier_party.tin',
    type: 'tin',
    required: true
  },
  'accounting_supplier_party.postal_address.street_name': {
    field: 'accounting_supplier_party.postal_address.street_name',
    type: 'string',
    required: true
  },
  'accounting_supplier_party.postal_address.city_name': {
    field: 'accounting_supplier_party.postal_address.city_name',
    type: 'string',
    required: true
  },
  'accounting_supplier_party.postal_address.country': {
    field: 'accounting_supplier_party.postal_address.country',
    type: 'string',
    required: true
  },
  'accounting_supplier_party.postal_address.state': {
    field: 'accounting_supplier_party.postal_address.state',
    type: 'string',
    required: true
  },
  'accounting_supplier_party.postal_address.lga': {
    field: 'accounting_supplier_party.postal_address.lga',
    type: 'string',
    required: true
  },
  'accounting_supplier_party.postal_address.postal_zone': {
    field: 'accounting_supplier_party.postal_address.postal_zone',
    type: 'string',
    required: true
  },
  
  // Monetary totals
  'legal_monetary_total.line_extension_amount': {
    field: 'legal_monetary_total.line_extension_amount',
    type: 'number',
    required: true,
    min: 0
  },
  'legal_monetary_total.tax_exclusive_amount': {
    field: 'legal_monetary_total.tax_exclusive_amount',
    type: 'number',
    required: true,
    min: 0
  },
  'legal_monetary_total.tax_inclusive_amount': {
    field: 'legal_monetary_total.tax_inclusive_amount',
    type: 'number',
    required: true,
    min: 0
  },
  'legal_monetary_total.payable_amount': {
    field: 'legal_monetary_total.payable_amount',
    type: 'number',
    required: true,
    min: 0
  },
  
  // Invoice line fields
  'invoice_line[].item.name': {
    field: 'invoice_line[].item.name',
    type: 'string',
    required: true
  },
  'invoice_line[].price.price_amount': {
    field: 'invoice_line[].price.price_amount',
    type: 'number',
    required: true,
    min: 0
  },
  'invoice_line[].invoiced_quantity': {
    field: 'invoice_line[].invoiced_quantity',
    type: 'number',
    required: true,
    min: 0
  },
  'invoice_line[].line_extension_amount': {
    field: 'invoice_line[].line_extension_amount',
    type: 'number',
    required: true,
    min: 0
  },
  'invoice_line[].hsn_code': {
    field: 'invoice_line[].hsn_code',
    type: 'string',
    required: true
  },
  'invoice_line[].product_category': {
    field: 'invoice_line[].product_category',
    type: 'string',
    required: true
  },
  
  // Tax total fields
  'tax_total[].tax_amount': {
    field: 'tax_total[].tax_amount',
    type: 'number',
    required: true,
    min: 0
  },
  'tax_total[].tax_subtotal[].taxable_amount': {
    field: 'tax_total[].tax_subtotal[].taxable_amount',
    type: 'number',
    required: true,
    min: 0
  },
  'tax_total[].tax_subtotal[].tax_amount': {
    field: 'tax_total[].tax_subtotal[].tax_amount',
    type: 'number',
    required: true,
    min: 0
  }
};

/**
 * Validates Excel headers
 */
export function validateHeaders(headers: string[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  if (!headers || headers.length === 0) {
    errors.push({
      type: 'error',
      message: 'Excel file has no headers. Please ensure the first row contains column names.',
    });
    return { isValid: false, errors, warnings };
  }
  
  // Check for empty headers
  const emptyHeaders = headers.filter((h, idx) => !h || h.trim() === '');
  if (emptyHeaders.length > 0) {
    warnings.push({
      type: 'warning',
      message: `Found ${emptyHeaders.length} empty header(s). These columns will be ignored.`,
      suggestion: 'Consider adding column names to all columns with data.'
    });
  }
  
  // Check for duplicate headers
  const headerCounts = new Map<string, number>();
  headers.forEach((h, idx) => {
    if (h && h.trim()) {
      const normalized = h.trim().toLowerCase();
      headerCounts.set(normalized, (headerCounts.get(normalized) || 0) + 1);
    }
  });
  
  const duplicates = Array.from(headerCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([header]) => header);
  
  if (duplicates.length > 0) {
    warnings.push({
      type: 'warning',
      message: `Found duplicate headers: ${duplicates.join(', ')}. This may cause mapping issues.`,
      suggestion: 'Rename duplicate columns to make them unique.'
    });
  }
  
  // Check for suspicious headers (dates in wrong places)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  headers.forEach((header) => {
    if (header && datePattern.test(header.trim())) {
      warnings.push({
        type: 'warning',
        field: header,
        message: `Header "${header}" looks like a date. Make sure this is a column name, not a date value.`,
        suggestion: 'Column names should be descriptive (e.g., "Issue Date", not "2024-01-01").'
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates field mappings
 */
export function validateMappings(
  headers: string[],
  mappings: FieldMapping
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Get required fields
  const requiredFields = INVOICE_FIELDS.filter(f => f.required);
  
  // Check required fields are mapped
  const mappedFields = Object.values(mappings).filter(m => m && m !== 'skip');
  const unmappedRequired = requiredFields.filter(
    field => !mappedFields.includes(field.value) && field.value !== 'business_id'
  );
  
  if (unmappedRequired.length > 0) {
    // Create individual errors for each unmapped required field
    unmappedRequired.forEach(field => {
      errors.push({
        type: 'error',
        field: field.value,
        message: `Required field "${field.label}" is not mapped.`,
        suggestion: 'Use the "Map Headers" button to assign this field to an Excel column.'
      });
    });
  }
  
  // Check mapped fields have corresponding Excel columns
  Object.entries(mappings).forEach(([excelHeader, mappedField]) => {
    if (mappedField && mappedField !== 'skip') {
      const headerExists = headers.some(
        h => h && h.trim().toLowerCase() === excelHeader.trim().toLowerCase()
      );
      
      if (!headerExists) {
        warnings.push({
          type: 'warning',
          field: excelHeader,
          message: `Mapped header "${excelHeader}" not found in Excel file.`,
          suggestion: 'Check if the header name matches exactly (case-insensitive).'
        });
      }
    }
  });
  
  // Check for conflicting mappings (same Excel column mapped to multiple fields)
  const headerToFieldMap = new Map<string, string[]>();
  Object.entries(mappings).forEach(([excelHeader, mappedField]) => {
    if (mappedField && mappedField !== 'skip') {
      const normalized = excelHeader.trim().toLowerCase();
      if (!headerToFieldMap.has(normalized)) {
        headerToFieldMap.set(normalized, []);
      }
      headerToFieldMap.get(normalized)!.push(mappedField);
    }
  });
  
  headerToFieldMap.forEach((fields, header) => {
    if (fields.length > 1) {
      warnings.push({
        type: 'warning',
        field: header,
        message: `Header "${header}" is mapped to multiple fields: ${fields.join(', ')}`,
        suggestion: 'Each Excel column should map to only one field.'
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates a sample value against field schema
 */
function validateValue(value: any, schema: FieldSchema): ValidationError | null {
  if (schema.required && (value === null || value === undefined || value === '')) {
    return {
      type: 'error',
      field: schema.field,
      message: `Required field "${schema.field}" is empty.`,
      suggestion: 'Ensure the Excel column contains data and is not empty.',
      value: value
    };
  }
  
  if (value === null || value === undefined || value === '') {
    return null; // Optional field, skip validation
  }
  
  // Type validation
  switch (schema.type) {
    case 'number':
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (isNaN(num) || !isFinite(num)) {
        return {
          type: 'error',
          field: schema.field,
          message: `Field "${schema.field}" must be a number, got: ${value}`,
          suggestion: 'Check if the Excel column contains numeric values only. Fix the value in your Excel file.',
          value: value
        };
      }
      if (schema.min !== undefined && num < schema.min) {
        return {
          type: 'error',
          field: schema.field,
          message: `Field "${schema.field}" must be >= ${schema.min}, got: ${num}`,
        };
      }
      if (schema.max !== undefined && num > schema.max) {
        return {
          type: 'error',
          field: schema.field,
          message: `Field "${schema.field}" must be <= ${schema.max}, got: ${num}`,
        };
      }
      break;
      
    case 'date':
      const dateStr = typeof value === 'string' ? value : String(value);
      if (!schema.format?.test(dateStr)) {
        return {
          type: 'error',
          field: schema.field,
          message: `Field "${schema.field}" must be a date in YYYY-MM-DD format, got: ${dateStr}`,
          suggestion: 'Format dates as YYYY-MM-DD (e.g., 2024-01-15). Fix the date format in your Excel file.',
          value: dateStr
        };
      }
      // Validate date is reasonable (1900-2100)
      const year = parseInt(dateStr.substring(0, 4));
      if (year < 1900 || year > 2100) {
        return {
          type: 'error',
          field: schema.field,
          message: `Field "${schema.field}" has invalid year: ${year}`,
          suggestion: 'Date year must be between 1900 and 2100.'
        };
      }
      break;
      
    case 'currency_code':
      const currencyStr = String(value).trim().toUpperCase();
      if (!schema.format?.test(currencyStr)) {
        return {
          type: 'error',
          field: schema.field,
          message: `Field "${schema.field}" must be a 3-letter currency code (e.g., NGN, USD), got: ${value}`,
          suggestion: 'Use standard 3-letter currency codes like NGN, USD, EUR. Fix the value in your Excel file.',
          value: value
        };
      }
      break;
      
    case 'email':
      const emailStr = String(value).trim();
      if (!schema.format?.test(emailStr)) {
        return {
          type: 'error',
          field: schema.field,
          message: `Field "${schema.field}" must be a valid email address, got: ${value}`,
          suggestion: 'Check email format (e.g., user@example.com). Fix the email in your Excel file.',
          value: value
        };
      }
      break;
      
    case 'invoice_type_code':
      const codeStr = String(value).trim();
      if (schema.allowedValues && !schema.allowedValues.includes(codeStr)) {
        return {
          type: 'warning',
          field: schema.field,
          message: `Field "${schema.field}" has value "${codeStr}" which may not be valid.`,
          suggestion: `Common values: ${schema.allowedValues?.slice(0, 3).join(', ')}. Default is "381".`
        };
      }
      break;
  }
  
  // Format validation
  if (schema.format && typeof value === 'string') {
    if (!schema.format.test(value)) {
      return {
        type: 'error',
        field: schema.field,
        message: `Field "${schema.field}" format is invalid.`,
        suggestion: 'Check the value matches the expected format.'
      };
    }
  }
  
  return null;
}

/**
 * Validates a single payload (one invoice/row)
 * @param payload - The invoice payload to validate
 * @param rowNumber - The Excel row number (for error reporting)
 * @param mappedFields - Optional: array of field paths that are mapped (only validate these)
 */
export function validatePayload(payload: any, rowNumber?: number, mappedFields?: string[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Helper to check if a field path is mapped (strict matching)
  const isFieldMapped = (fieldPath: string): boolean => {
    if (!mappedFields || mappedFields.length === 0) return false;
    
    // Direct exact match (most common case)
    if (mappedFields.includes(fieldPath)) return true;
    
    // Check if this field path is a child of a mapped parent
    // e.g., if "legal_monetary_total" is mapped, then "legal_monetary_total.line_extension_amount" is considered mapped
    // This allows mapping parent objects and validating all nested fields
    if (mappedFields.some(mf => fieldPath.startsWith(mf + '.'))) return true;
    
    // For nested fields, check if the full parent path is mapped
    // e.g., "legal_monetary_total.line_extension_amount" - check if "legal_monetary_total" is mapped
    const pathParts = fieldPath.split('.');
    for (let i = 1; i < pathParts.length; i++) {
      const parentPath = pathParts.slice(0, i).join('.');
      if (mappedFields.includes(parentPath)) return true;
    }
    
    // Don't do partial matches (e.g., don't match "line_extension_amount" to "legal_monetary_total.line_extension_amount")
    // This prevents false positives when only a field name is mapped but not the full path
    
    return false;
  };
  
  // Validate top-level required fields
  // ONLY validate fields that are mapped - don't validate unmapped fields even if they exist in payload
  Object.entries(FIELD_SCHEMA).forEach(([fieldPath, schema]) => {
    // Skip array fields for now (handled separately)
    if (fieldPath.includes('[]')) {
      return;
    }
    
    // Only validate if field is mapped
    if (!isFieldMapped(fieldPath)) {
      return; // Skip validation for unmapped fields
    }
    
    const value = getNestedValue(payload, fieldPath);
    const error = validateValue(value, schema);
    if (error) {
      const errorWithRow = { ...error };
      if (rowNumber) errorWithRow.row = rowNumber;
      if (error.type === 'error') {
        errors.push(errorWithRow);
      } else {
        warnings.push(errorWithRow);
      }
    }
  });
  
  // Validate invoice_line array
  // Only validate if invoice_line fields are mapped
  const hasInvoiceLineMapping = mappedFields?.some(mf => mf.includes('invoice_line'));
  
  if (hasInvoiceLineMapping) {
    if (!payload.invoice_line || !Array.isArray(payload.invoice_line) || payload.invoice_line.length === 0) {
      const error: ValidationError = {
        type: 'error',
        field: 'invoice_line',
        message: 'invoice_line is required and must have at least one item.',
        suggestion: 'Map invoice_line fields to Excel columns with line item data.'
      };
      if (rowNumber) error.row = rowNumber;
      errors.push(error);
    } else {
      payload.invoice_line.forEach((line: any, index: number) => {
        const lineFields = [
          'invoice_line[].item.name',
          'invoice_line[].price.price_amount',
          'invoice_line[].invoiced_quantity',
          'invoice_line[].line_extension_amount',
          'invoice_line[].hsn_code',
          'invoice_line[].product_category'
        ];
        
        lineFields.forEach(fieldPath => {
          // Only validate if this specific field is mapped
          const baseField = fieldPath.replace('invoice_line[].', '');
          const isFieldMapped = mappedFields?.some(mf => {
            // Check for exact match or partial match
            if (mf === fieldPath) return true;
            // Check if mapped field matches the base field (e.g., "item.name" matches "invoice_line[].item.name")
            if (mf.includes(baseField) || baseField.includes(mf.replace('invoice_line[].', ''))) return true;
            // Check for nested matches (e.g., "price.price_amount" matches "invoice_line[].price.price_amount")
            const mfBase = mf.replace('invoice_line[].', '');
            return baseField === mfBase || baseField.endsWith('.' + mfBase) || mfBase.endsWith('.' + baseField);
          });
          
          // Skip validation if field is not mapped
          if (!isFieldMapped) {
            return;
          }
          
          const value = getNestedValue(line, baseField);
          const schema = FIELD_SCHEMA[fieldPath];
          
          if (schema) {
            const error = validateValue(value, schema);
            if (error) {
              error.field = `${fieldPath}[${index}]`;
              if (rowNumber) error.row = rowNumber;
              if (error.type === 'error') {
                errors.push(error);
              } else {
                warnings.push(error);
              }
            }
          }
        });
      });
    }
  }
  
  // Validate tax_total structure
  if (!payload.tax_total || !Array.isArray(payload.tax_total) || payload.tax_total.length === 0) {
    const warning: ValidationError = {
      type: 'warning',
      field: 'tax_total',
      message: 'tax_total is recommended. It will be auto-generated if missing.',
    };
    if (rowNumber) warning.row = rowNumber;
    warnings.push(warning);
  } else {
    payload.tax_total.forEach((tax: any, index: number) => {
      if (!tax.tax_amount && tax.tax_amount !== 0) {
        const error: ValidationError = {
          type: 'error',
          field: `tax_total[${index}].tax_amount`,
          message: `tax_total[${index}].tax_amount is required.`,
        };
        if (rowNumber) error.row = rowNumber;
        errors.push(error);
      }
      
      if (!tax.tax_subtotal || !Array.isArray(tax.tax_subtotal) || tax.tax_subtotal.length === 0) {
        const error: ValidationError = {
          type: 'error',
          field: `tax_total[${index}].tax_subtotal`,
          message: `tax_total[${index}].tax_subtotal is required and must have at least one item.`,
        };
        if (rowNumber) error.row = rowNumber;
        errors.push(error);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Helper to get nested value from object
 */
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Validates all rows from Excel file
 * @param payloads - Array of invoice payloads (one per Excel row)
 * @param mappedFields - Optional: array of field paths that are mapped
 * @returns Validation result with row numbers
 */
export function validateRows(payloads: any[], mappedFields?: string[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];
  
  payloads.forEach((payload, index) => {
    // Row number = index + 2 (because row 1 is headers, data starts at row 2)
    const rowNumber = index + 2;
    const result = validatePayload(payload, rowNumber, mappedFields);
    
    result.errors.forEach(e => {
      allErrors.push(e);
    });
    
    result.warnings.forEach(w => {
      allWarnings.push(w);
    });
  });
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Checks if all required fields are mapped
 * @param mappings - Field mappings
 * @returns true if all required fields are mapped
 */
export function hasRequiredMappings(mappings: FieldMapping): boolean {
  const mappedValues = Object.values(mappings)
    .filter(m => m && m !== 'skip')
    .map(m => m as string);
  
  return INVOICE_FIELDS
    .filter(f => f.required)
    .every(f => mappedValues.includes(f.value));
}

/**
 * Comprehensive validation - runs all validation checks
 * @param headers - Excel headers
 * @param mappings - Field mappings
 * @param payloads - Array of payloads to validate (optional, for row-level validation)
 * @param samplePayload - Single sample payload (optional, for quick validation)
 */
export function validateAll(
  headers: string[],
  mappings: FieldMapping,
  payloads?: any[],
  samplePayload?: any
): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];
  
  // Get list of mapped field paths for payload validation
  const mappedFields = Object.values(mappings)
    .filter(m => m && m !== 'skip')
    .map(m => m as string);
  
  // 1. Validate headers
  const headerValidation = validateHeaders(headers);
  allErrors.push(...headerValidation.errors);
  allWarnings.push(...headerValidation.warnings);
  
  // 2. Validate mappings
  const mappingValidation = validateMappings(headers, mappings);
  allErrors.push(...mappingValidation.errors);
  allWarnings.push(...mappingValidation.warnings);
  
  // 3. Only validate payload if required mappings exist
  // This prevents confusing "empty field" errors when fields aren't mapped yet
  const requiredFieldsMapped = hasRequiredMappings(mappings);
  
  if (requiredFieldsMapped) {
    // Validate all rows if provided (preferred for Excel imports)
    // Only validate payload structure and values for fields that are mapped
    if (payloads && payloads.length > 0) {
      const rowsValidation = validateRows(payloads, mappedFields);
      allErrors.push(...rowsValidation.errors);
      allWarnings.push(...rowsValidation.warnings);
    } else if (samplePayload) {
      // Fallback to single payload validation
      const payloadValidation = validatePayload(samplePayload, undefined, mappedFields);
      allErrors.push(...payloadValidation.errors);
      allWarnings.push(...payloadValidation.warnings);
    }
  }
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Generates a CSV error report for download
 * @param validationResult - Validation result with errors
 * @returns CSV string
 */
export function generateErrorReport(validationResult: ValidationResult): string {
  const lines: string[] = ['Row,Type,Field,Error,Suggestion'];
  
  validationResult.errors.forEach(error => {
    const row = error.row?.toString() || 'N/A';
    const type = error.type.toUpperCase();
    const field = error.field || 'N/A';
    const message = error.message.replace(/,/g, ';'); // Replace commas to avoid CSV issues
    const suggestion = error.suggestion?.replace(/,/g, ';') || '';
    lines.push(`${row},${type},${field},${message},${suggestion}`);
  });
  
  validationResult.warnings.forEach(warning => {
    const row = warning.row?.toString() || 'N/A';
    const type = warning.type.toUpperCase();
    const field = warning.field || 'N/A';
    const message = warning.message.replace(/,/g, ';');
    const suggestion = warning.suggestion?.replace(/,/g, ';') || '';
    lines.push(`${row},${type},${field},${message},${suggestion}`);
  });
  
  return lines.join('\n');
}

