# Pre-Upload Validation Plan

## Overview
Validate Excel headers, mappings, and data BEFORE uploading to the API to catch issues early and provide clear guidance to users.

## Validation Layers

### 1. **Header Validation** (After Excel is parsed)
- ✅ Check Excel file has headers row
- ✅ Check headers are not empty
- ✅ Check for duplicate headers
- ✅ Warn about suspicious headers (dates in wrong columns, etc.)

### 2. **Mapping Validation** (After auto-mapping or manual mapping)
- ✅ Check required fields are mapped
- ✅ Check mapped fields have corresponding Excel columns
- ✅ Validate field types match expected types
- ✅ Check for conflicting mappings (same Excel column mapped to multiple fields)

### 3. **Data Type Validation** (Before building payload)
- ✅ Validate dates are in correct format (YYYY-MM-DD)
- ✅ Validate numbers are actually numbers (not strings like "NGN per 1")
- ✅ Validate currency codes are 3-letter codes (NGN, USD, etc.)
- ✅ Validate invoice_type_code is numeric (e.g., "381")
- ✅ Validate email formats
- ✅ Validate TIN formats

### 4. **Required Field Validation** (Before building payload)
- ✅ Check all required top-level fields are mapped
- ✅ Check nested required fields (supplier party, customer party)
- ✅ Check invoice_line has required fields mapped
- ✅ Check tax_total structure if mapped

### 5. **Value Validation** (After building payload, before sending)
- ✅ Check required fields have non-empty values
- ✅ Check date values are valid (not "0380-12-31")
- ✅ Check numeric values are valid (not NaN, not Infinity)
- ✅ Check nested objects are properly structured
- ✅ Check arrays have at least one item if required

### 6. **Structure Validation** (After building payload)
- ✅ Validate invoice_line structure
- ✅ Validate tax_total structure
- ✅ Validate postal_address structure
- ✅ Validate legal_monetary_total structure

## Validation Flow

```
1. User uploads Excel
   ↓
2. Parse Excel → Get headers
   ↓
3. Auto-map headers
   ↓
4. Run Header Validation
   ↓
5. User reviews/maps fields (optional)
   ↓
6. Run Mapping Validation
   ↓
7. Build sample payload from first row
   ↓
8. Run Data Type Validation
   ↓
9. Run Required Field Validation
   ↓
10. Run Value Validation
   ↓
11. Run Structure Validation
   ↓
12. If all valid → Show "Ready to Upload" button
    If errors → Show validation errors with "Fix Mappings" button
   ↓
13. User clicks "Upload" → Send to API
```

## Validation Error Types

### Critical Errors (Block Upload)
- Missing required fields
- Invalid data types that can't be auto-fixed
- Invalid structure that will cause API errors

### Warnings (Allow Upload but Warn)
- Optional fields missing
- Data type mismatches that can be auto-fixed
- Suspicious values (dates in currency fields, etc.)

## Implementation Strategy

1. **Create `validationUtils.ts`** - Centralized validation functions
2. **Add validation schema** - Define expected types, formats, required fields
3. **Create `validateHeaders()`** - Validate Excel headers
4. **Create `validateMappings()`** - Validate field mappings
5. **Create `validatePayload()`** - Validate built payload
6. **Add validation UI** - Show validation results before upload
7. **Add "Validate" button** - Let users validate before uploading

## Benefits

✅ Catch errors BEFORE API call
✅ Provide clear, actionable error messages
✅ Reduce API errors and debugging time
✅ Better user experience
✅ Prevent invalid data from being sent

