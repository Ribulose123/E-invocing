export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  companyName: string;
  tin: string;
  email: string;
  password: string;
  agreeToTerms: boolean; // Not sent to backend
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  status: string;
  status_code: number;
  message: string;
  data: {
    access_token: string;
    user: User;
  };
}

export interface Invoice {
  id: string
  invoice_number: string
  irn:string
  platform:string
  current_status: string
  status_text: 'success' | 'pending' | 'failed'
  created_at?: string
}

export interface ReceivedInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ReceivedInvoiceStatusHistory {
  step: string;
  status: 'success' | 'pending' | 'failed';
  timestamp?: string;
  message?: string;
}

export interface ReceivedInvoice {
  id: string;
  invoiceNumber: string;
  irn: string;
  date: string;
  dueDate: string;
  recipientName: string;
  recipientTin: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue';
  items: ReceivedInvoiceItem[];
  statusHistory: ReceivedInvoiceStatusHistory[];
}

export interface StatusHistory {
  step: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: string;
  message?: string;
  error?: string;
}

export interface InvoiceDetails {
  id: string;
  invoice_number: string;
  irn: string;
  platform: string;
  current_status: string;
  created_at: string;
  status_history?: StatusHistory[]; 
}

export interface InvoiceFormData {
  file: FileList
  invoice_number: string
}