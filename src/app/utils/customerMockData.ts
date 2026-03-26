import type { Invoice } from "../type";

export interface CustomerWithInvoices {
  id: string;
  name: string;
  invoices: Invoice[];
}

export const getMockCustomersWithInvoices = async (): Promise<CustomerWithInvoices[]> => {
  await new Promise((resolve) => setTimeout(resolve, 250));

  return [
    {
      id: "cust-001",
      name: "Acme Retail Ltd",
      invoices: [
        {
          id: "inv-acme-001",
          invoice_number: "ACM-2026-001",
          irn: "IRN-ACM-001",
          platform: "internal",
          current_status: "Validated",
          status_text: "success",
          created_at: "2026-03-05T08:12:00Z",
        },
        {
          id: "inv-acme-002",
          invoice_number: "ACM-2026-002",
          irn: "IRN-ACM-002",
          platform: "external",
          current_status: "Pending confirmation",
          status_text: "pending",
          created_at: "2026-03-11T13:42:00Z",
        },
      ],
    },
    {
      id: "cust-002",
      name: "Bluefin Logistics",
      invoices: [
        {
          id: "inv-blue-001",
          invoice_number: "BLF-2026-011",
          irn: "IRN-BLF-011",
          platform: "internal",
          current_status: "Transmission failed",
          status_text: "failed",
          created_at: "2026-03-10T09:18:00Z",
        },
        {
          id: "inv-blue-002",
          invoice_number: "BLF-2026-012",
          irn: "IRN-BLF-012",
          platform: "external",
          current_status: "Partially successful",
          status_text: "partial_success",
          created_at: "2026-03-14T16:27:00Z",
        },
      ],
    },
    {
      id: "cust-003",
      name: "Northwind Services",
      invoices: [
        {
          id: "inv-nth-001",
          invoice_number: "NTH-2026-021",
          irn: "IRN-NTH-021",
          platform: "internal",
          current_status: "Validated",
          status_text: "success",
          created_at: "2026-03-02T10:00:00Z",
        },
      ],
    },
  ];
};

