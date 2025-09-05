export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
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
}

export interface StatusHistory {
  step: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: string;
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