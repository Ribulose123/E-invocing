export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
  is_sandbox?: boolean;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  companyName: string;
  tin: string;
  email: string;
  password: string;
  confirmPassword: string;
  is_aggregator: boolean;
  is_sandbox?: boolean;
  agreeToTerms: boolean; // Not sent to backend
}

export interface User {
  id: string;
  email: string;
  name: string;
  business_id: string;
  tin?: string;
  companyName?: string;
  phoneNumber?: string;
  is_sandbox?: boolean;
  is_aggregator?: boolean;
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
  status_text: 'success' | 'pending' | 'failed' | 'partial_success'
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
supplier:string;  
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