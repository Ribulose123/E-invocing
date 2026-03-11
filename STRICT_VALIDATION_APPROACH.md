# Strict Validation Approach for E-Invoicing System

## Philosophy: No Auto-Fixes, User Must Fix Excel

This system follows a **strict validation approach** suitable for regulated tax/invoicing systems:

✅ **Show errors clearly**  
✅ **Block upload when errors exist**  
✅ **User fixes Excel file**  
❌ **NO automatic data fixes**  
❌ **NO silent defaults**  
❌ **NO data transformation**

## Why This Approach?

For tax invoicing systems (especially government e-invoice APIs like FIRS):
- **Compliance**: Auto-fixing data can create compliance issues
- **Audit Trail**: Users must explicitly provide correct data
- **Legal Requirements**: Tax authorities require accurate, unmodified data
- **Transparency**: Users see exactly what's wrong and fix it themselves

## Validation Flow

```
1. User uploads Excel
   ↓
2. Parse headers
   ↓
3. Validate headers (check for duplicates, empty headers, etc.)
   ↓
4. Auto-map headers (suggestions only)
   ↓
5. User reviews/maps fields
   ↓
6. Validate mappings (check required fields are mapped)
   ↓
7. Build payloads for ALL rows
   ↓
8. Validate ALL rows (not just sample)
   ↓
9. Show validation results:
   - Errors (block upload)
   - Warnings (informational)
   ↓
10. If errors exist:
    - Disable upload button
    - Show clear error messages
    - Offer error report download
   ↓
11. User fixes Excel file
   ↓
12. User uploads again
   ↓
13. If valid → Upload to API
```

## Error Types

### 1. Header Errors
- Empty headers
- Duplicate headers
- Headers that look like dates (suspicious)

### 2. Mapping Errors
- Missing required field mappings
- Mapped fields without corresponding Excel columns
- Conflicting mappings (same column mapped to multiple fields)

### 3. Data Errors (Row-Level)
- Invalid data types (string in number field)
- Invalid formats (wrong date format, invalid email)
- Missing required values
- Invalid values (year out of range, etc.)

### 4. Structure Errors
- Missing invoice_line items
- Invalid tax_total structure
- Missing nested objects

## Error Display Format

### In UI:
```
❌ 3 Errors Found
⚠ 2 Warnings

Errors:
Row 4
Field: price.price_amount
Price must be a number
Value found: "NGN per 1"
Suggestion: Check if the Excel column contains numeric values only. Fix the value in your Excel file.

Row 5
Field: invoice_line.hsn_code
HSN code is required
Suggestion: Map this field to an Excel column with data.

Row 9
Field: accounting_supplier_party.email
Invalid email format
Value found: "not-an-email"
Suggestion: Check email format (e.g., user@example.com). Fix the email in your Excel file.
```

### Error Report (CSV):
```csv
Row,Type,Field,Error,Suggestion
4,ERROR,price.price_amount,Price must be a number,Check if the Excel column contains numeric values only. Fix the value in your Excel file.
5,ERROR,invoice_line.hsn_code,HSN code is required,Map this field to an Excel column with data.
9,ERROR,accounting_supplier_party.email,Invalid email format,Check email format (e.g., user@example.com). Fix the email in your Excel file.
```

## Implementation

### Validation Functions

1. **`validateHeaders(headers)`** - Validates Excel headers
2. **`validateMappings(headers, mappings)`** - Validates field mappings
3. **`validatePayload(payload, rowNumber)`** - Validates single payload
4. **`validateRows(payloads)`** - Validates all rows (calls validatePayload for each)
5. **`validateAll(headers, mappings, payloads)`** - Comprehensive validation
6. **`generateErrorReport(result)`** - Generates CSV error report

### Upload Blocking Logic

```typescript
if (validationResult.errors.length > 0) {
  // Disable upload button
  // Show error messages
  // Offer error report download
  return; // Don't proceed with upload
}
```

## Key Features

✅ **Row-level validation** - Every Excel row is validated  
✅ **Clear error messages** - Users know exactly what to fix  
✅ **Row numbers** - Users can find errors in their Excel file  
✅ **No auto-fixes** - Users must fix Excel themselves  
✅ **Error report download** - CSV file with all errors  
✅ **Upload blocking** - Prevents invalid data from being sent  

## User Experience

1. User uploads Excel
2. System validates and shows errors
3. User downloads error report (optional)
4. User fixes Excel file based on errors
5. User uploads again
6. System validates again
7. If valid → Upload proceeds

This ensures:
- Users are in control of their data
- No silent data modifications
- Compliance with tax authority requirements
- Clear audit trail

