# API Payload Documentation - Invoice Upload Endpoint

## What the Frontend is Currently Sending

**Endpoint:** `POST https://einvoice.gention.tech/api/v1/invoice/upload`

**Content-Type:** `multipart/form-data` (automatically set by browser)

**FormData Payload:**
```
file: [File] invoce.xlsx (11342 bytes)
  - Type: Excel file (.xlsx)
  - MIME Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

business_id: "01991247-39fc-7c27-b36d-e1b63426c22f"

invoice_number: "INV-2024-0001"
```

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzUxMiIs...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

**Payload as JSON (for reference):**
```json
{
  "file": {
    "type": "File",
    "name": "invoce.xlsx",
    "size": "11342 bytes",
    "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  },
  "business_id": "01991247-39fc-7c27-b36d-e1b63426c22f",
  "invoice_number": "INV-2024-0001"
}
```

---

## Backend Response

**Status:** 400 Bad Request

**Response Body:**
```json
{
  "status": "error",
  "status_code": 400,
  "message": "invoice number is required"
}
```

---

## What the Backend Might Be Expecting

Based on the Swagger documentation, the backend expects:

```json
{
  "invoice_number": "string",
  "issue_date": "string",
  "due_date": "string",
  "invoice_type_code": "string",
  "irn": "string",
  "issue_time": "string",
  "legal_monetary_total": {
    "line_extension_amount": 0,
    "payable_amount": 0,
    "tax_exclusive_amount": 0,
    "tax_inclusive_amount": 0
  },
  // ... other fields
}
```

---

## The Problem

The frontend IS sending `invoice_number: "INV-2024-0001"` in the FormData, but the backend is still saying "invoice number is required".

**Possible Issues:**

1. **Backend not reading FormData correctly** - The backend might not be parsing the `invoice_number` field from FormData
2. **Backend expects invoice_number from Excel file** - The backend might be reading `invoice_number` from the Excel file itself, not from FormData
3. **Field name mismatch** - Backend might expect `invoiceNumber` (camelCase) instead of `invoice_number` (snake_case)
4. **Backend validation bug** - The backend validation logic might have a bug

---

## Questions for Backend Developer

1. **Does the `/invoice/upload` endpoint read `invoice_number` from FormData or from the Excel file?**
   - If from FormData: Why isn't it finding the `invoice_number` field we're sending?
   - If from Excel file: The Excel file has an `invoice_number` column at index 72 with value "INV-2024-0001"

2. **What exact field name does the backend expect?**
   - `invoice_number` (snake_case) ✓ We're sending this
   - `invoiceNumber` (camelCase)?
   - `invoice`?

3. **What format does the backend expect?**
   - FormData with `file`, `business_id`, and `invoice_number`? ✓ We're sending this
   - JSON body with invoice_number + separate file upload?
   - Only Excel file (extract invoice_number from Excel)?

4. **Can you check your FormData parsing code?**
   - Are you reading all FormData fields correctly?
   - Are you checking for `invoice_number` in the right place?

---

## Excel File Structure

The Excel file being sent has:
- **73 columns total**
- **`invoice_number` column at index 72** (last column)
- **Value in row 2:** "INV-2024-0001"
- **Column name:** "invoice_number" (exact match)

---

## Summary

**Frontend is sending:**
- ✅ `file`: Excel file
- ✅ `business_id`: UUID string
- ✅ `invoice_number`: "INV-2024-0001"

**Backend is saying:**
- ❌ "invoice number is required"

**Conclusion:** This is a **backend issue**. The frontend is sending the data correctly. The backend needs to fix how it reads/validates the `invoice_number` field.

