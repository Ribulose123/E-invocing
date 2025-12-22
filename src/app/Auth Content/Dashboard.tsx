'use client'
import React, { useEffect, useState } from "react";
import { User, Invoice } from "../type";
import { useRouter } from "next/navigation";
import { API_END_POINT } from "../config/Api";
import { InvoiceTable } from "@/components/InvoiceTable";
import { UploadDialog } from "@/components/UploadDialog";
import { ManageMappingsDialog } from "@/components/ManageMappingsDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, LogOut, Upload, Settings, X } from "lucide-react";
import type { ReceivedInvoice } from "../type";
import type { FieldMapping } from "@/components/FieldMappingDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (businessId: string) => void;
  isLoading: boolean;
}

const BusinessModal: React.FC<BusinessModalProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [businessId, setBusinessId] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessId.trim()) {
      onSubmit(businessId.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Complete Your Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h4 className="text-center text-lg font-medium text-gray-900 mb-2">
              One Last Step
            </h4>
            <p className="text-center text-sm text-gray-600 mb-4">
              Please provide your Business ID to complete your profile setup.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-id" className="text-sm font-medium">
                Business ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="business-id"
                type="text"
                placeholder="e.g., BIZ-12345"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                required
                disabled={isLoading}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                This ID is required to access all features. Contact support if you don't have one.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-700">
                💡 <strong>Where to find your Business ID?</strong><br />
                • Check your welcome email<br />
                • Look in your account settings<br />
                • Contact your administrator
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !businessId.trim()}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save & Continue'
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="w-full"
            >
              I'll do this later
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sentInvoices, setSentInvoices] = useState<Invoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedInvoice[]>([]);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [businessIdLoading, setBusinessIdLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const router = useRouter();

  const MAPPING_STORAGE_KEY = 'invoiceFieldMappings';

  // Profile Completion Guard
  useEffect(() => {
    const checkProfileCompletion = () => {
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('authToken');
      
      if (!userData || !token) {
        router.push('/login');
        return;
      }

      try {
        const userObj = JSON.parse(userData) as User;
        setUser(userObj);

        // Check if user has business_id in the stored data
        const hasBusinessIdInData = userObj.business_id && userObj.business_id.trim() !== '';
        
        // Check if we've stored business_id separately
        const storedBusinessId = localStorage.getItem('userBusinessId');
        
        // Check if user previously skipped
        const hasSkipped = localStorage.getItem('businessIdSkipped') === 'true';
        
        // Show modal if: no business_id in data AND no stored business_id AND user hasn't skipped
        if (!hasBusinessIdInData && !storedBusinessId && !hasSkipped) {
          setShowBusinessModal(true);
          setIsCheckingProfile(false);
        } else {
          // User has business_id or skipped, load content
          setIsCheckingProfile(false);
          fetchInvoices(userObj.id);
          fetchReceivedInvoices(userObj.id);
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
        router.push('/');
      }
    };

    checkProfileCompletion();
  }, [router]);

  const handleBusinessIdSubmit = (businessId: string) => {
    setBusinessIdLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Store business_id in localStorage
      localStorage.setItem("userBusinessId", businessId);
      
      // Update userData in localStorage with business_id
      if (user) {
        const updatedUserData = {
          ...user,
          business_id: businessId
        };
        localStorage.setItem("userData", JSON.stringify(updatedUserData));
        setUser(updatedUserData);
      }
      
      // Remove skip flag if exists
      localStorage.removeItem("businessIdSkipped");
      
      // Close modal and load content
      setShowBusinessModal(false);
      fetchInvoices(user?.id || '');
      fetchReceivedInvoices(user?.id || '');
      setBusinessIdLoading(false);
    }, 500);
  };

  const handleSkipBusinessId = () => {
    // Store skip flag
    localStorage.setItem("businessIdSkipped", "true");
    setShowBusinessModal(false);
    
    // Load content after skipping
    if (user) {
      fetchInvoices(user.id);
      fetchReceivedInvoices(user.id);
    }
    setIsCheckingProfile(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userBusinessId');
    localStorage.removeItem('businessIdSkipped');
    router.push('/');
  }

  const fetchInvoices = async (businessId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(API_END_POINT.INVOICE.GET_ALL_iNVOICE.replace("{business_id}", businessId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData && Array.isArray(responseData.data)) {
          setSentInvoices(responseData.data);
        } else {
          setMessage('Failed to fetch invoices: Invalid data format received.');
          setSentInvoices([]);
        }
      } else {
        setMessage('Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setMessage('Error fetching invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReceivedInvoices = async (businessId: string) => {
    try {
      // Mock data for received invoices - replace with actual API call when backend is ready
      // businessId will be used when connecting to the actual API endpoint
      void businessId; // Suppress unused parameter warning
      
      const mockReceivedInvoicesData: ReceivedInvoice[] = [
        {
          id: '101',
          invoiceNumber: 'RCV-2024-001',
          irn: 'IRN-2024-101',
          date: '2024-01-18',
          dueDate: '2024-02-18',
          recipientName: 'Cloud Services Pro',
          recipientTin: '111222333',
          amount: 2500.00,
          currency: 'USD',
          status: 'paid',
          items: [
            {
              description: 'Cloud Hosting - January',
              quantity: 1,
              unitPrice: 2500.00,
              total: 2500.00,
            },
          ],
          statusHistory: [
            { step: 'Created', status: 'success', timestamp: '2024-01-18T08:30:10' },
            { step: 'Generated IRN', status: 'success', timestamp: '2024-01-18T08:30:10' },
            { step: 'Validated IRN', status: 'success', timestamp: '2024-01-18T08:30:10' },
            { step: 'Signed IRN', status: 'success', timestamp: '2024-01-18T08:30:10' },
            { step: 'Validated Invoice', status: 'success', timestamp: '2024-01-18T08:30:10' },
            { step: 'Signed Invoice', status: 'success', timestamp: '2024-01-18T08:30:11' },
            { step: 'Transmitted Invoice', status: 'success', timestamp: '2024-01-18T08:30:11' },
            { step: 'Confirmed Invoice', status: 'success', timestamp: '2024-01-18T08:30:12' },
          ],
        },
        {
          id: '102',
          invoiceNumber: 'RCV-2024-002',
          irn: 'IRN-2024-102',
          date: '2024-01-22',
          dueDate: '2024-02-22',
          recipientName: 'Office Supplies Co',
          recipientTin: '444555666',
          amount: 850.00,
          currency: 'USD',
          status: 'pending',
          items: [
            {
              description: 'Office Equipment',
              quantity: 10,
              unitPrice: 85.00,
              total: 850.00,
            },
          ],
          statusHistory: [
            { step: 'Created', status: 'success', timestamp: '2024-01-22T13:15:40' },
            { step: 'Generated IRN', status: 'success', timestamp: '2024-01-22T13:15:40' },
            { step: 'Validated IRN', status: 'success', timestamp: '2024-01-22T13:15:40' },
            { step: 'Signed IRN', status: 'success', timestamp: '2024-01-22T13:15:40' },
            { step: 'Validated Invoice', status: 'success', timestamp: '2024-01-22T13:15:40' },
            { step: 'Signed Invoice', status: 'success', timestamp: '2024-01-22T13:15:41' },
            { step: 'Transmitted Invoice', status: 'success', timestamp: '2024-01-22T13:15:41' },
            { step: 'Confirmed Invoice', status: 'pending' },
          ],
        },
        {
          id: '103',
          invoiceNumber: 'RCV-2024-003',
          irn: 'IRN-2024-103',
          date: '2024-01-05',
          dueDate: '2024-02-05',
          recipientName: 'Marketing Agency Plus',
          recipientTin: '777888999',
          amount: 6500.00,
          currency: 'USD',
          status: 'overdue',
          items: [
            {
              description: 'Digital Marketing Campaign',
              quantity: 1,
              unitPrice: 6500.00,
              total: 6500.00,
            },
          ],
          statusHistory: [
            { step: 'Created', status: 'success', timestamp: '2024-01-05T11:52:30' },
            { step: 'Generated IRN', status: 'success', timestamp: '2024-01-05T11:52:30' },
            { step: 'Validated IRN', status: 'success', timestamp: '2024-01-05T11:52:30' },
            { step: 'Signed IRN', status: 'success', timestamp: '2024-01-05T11:52:30' },
            { step: 'Validated Invoice', status: 'success', timestamp: '2024-01-05T11:52:30' },
            { step: 'Signed Invoice', status: 'success', timestamp: '2024-01-05T11:52:31' },
            { step: 'Transmitted Invoice', status: 'failed', timestamp: '2024-01-05T11:52:31', message: 'Recipient server unavailable' },
            { step: 'Confirmed Invoice', status: 'pending' },
          ],
        },
        {
          id: '104',
          invoiceNumber: 'RCV-2024-004',
          irn: 'IRN-2024-104',
          date: '2024-01-30',
          dueDate: '2024-02-28',
          recipientName: 'Legal Services LLC',
          recipientTin: '222333444',
          amount: 3200.00,
          currency: 'USD',
          status: 'pending',
          items: [
            {
              description: 'Legal Consultation',
              quantity: 8,
              unitPrice: 400.00,
              total: 3200.00,
            },
          ],
          statusHistory: [
            { step: 'Created', status: 'success', timestamp: '2024-01-30T15:40:55' },
            { step: 'Generated IRN', status: 'success', timestamp: '2024-01-30T15:40:55' },
            { step: 'Validated IRN', status: 'success', timestamp: '2024-01-30T15:40:55' },
            { step: 'Signed IRN', status: 'success', timestamp: '2024-01-30T15:40:55' },
            { step: 'Validated Invoice', status: 'success', timestamp: '2024-01-30T15:40:55' },
            { step: 'Signed Invoice', status: 'success', timestamp: '2024-01-30T15:40:56' },
            { step: 'Transmitted Invoice', status: 'success', timestamp: '2024-01-30T15:40:56' },
            { step: 'Confirmed Invoice', status: 'pending' },
          ],
        },
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setReceivedInvoices(mockReceivedInvoicesData);
    } catch (error) {
      console.error('Error fetching received invoices:', error);
      setReceivedInvoices([]);
    }
  };

  const handleUploadSuccess = () => {
    if (user) {
      fetchInvoices(user.id);
      fetchReceivedInvoices(user.id);
    }
  };

  const handleInvoiceUpdate = () => {
    if (user) {
      fetchInvoices(user.id);
      fetchReceivedInvoices(user.id);
    }
  };

  const getSavedMappings = (): FieldMapping => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(MAPPING_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const clearMappings = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(MAPPING_STORAGE_KEY);
      setMessage('Field mappings cleared successfully');
    } catch (error) {
      console.error('Failed to clear mappings:', error);
      setMessage('Failed to clear mappings');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Profile Completion Modal */}
      <BusinessModal
        isOpen={showBusinessModal}
        onClose={handleSkipBusinessId}
        onSubmit={handleBusinessIdSubmit}
        isLoading={businessIdLoading}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16 py-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="bg-[#8B1538] p-1.5 sm:p-2 rounded-lg flex-shrink-0">
                <FileText className="size-4 sm:size-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl text-slate-900 truncate">
                  Gention E-invoice
                </h1>
                {user && (
                  <p className="text-xs text-slate-600 truncate hidden sm:block">
                    {user.name} • {user.business_id || localStorage.getItem('userBusinessId') || 'No Business ID'}
                  </p>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4"
            >
              <LogOut className="size-3 sm:size-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Only show when not checking profile */}
      {!isCheckingProfile ? (
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 overflow-x-hidden">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div className="w-full sm:w-auto">
              <h2 className="text-xl sm:text-2xl text-slate-900">Invoice Management</h2>
              <p className="text-sm sm:text-base text-slate-600">View and manage your invoices</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowManageModal(true)}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <Settings className="size-3 sm:size-4 sm:mr-2" />
                <span className="hidden sm:inline">Manage Invoice</span>
                <span className="sm:hidden">Manage</span>
              </Button>
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <Upload className="size-3 sm:size-4 sm:mr-2" />
                <span className="hidden sm:inline">Upload Excel</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </div>
          </div>

          {/* Display messages */}
          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.includes('success') ? 'bg-green-100 text-green-800 border border-green-400' :
              'bg-red-100 text-red-800 border border-red-400'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">
                    {message.includes('success') ? 'Success' : 'Error'}
                  </h4>
                  <p>{message}</p>
                </div>
                <button
                  onClick={() => setMessage('')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              {/* Additional guidance for specific errors */}
              {message.includes('duplicate') && (
                <div className="mt-2 p-2 bg-yellow-50 rounded">
                  <p className="text-sm text-yellow-800">
                    💡 Tip: Ensure each invoice has a unique invoice number.
                    If this is a retry, wait a few minutes before trying again.
                  </p>
                </div>
              )}
              
              {message.includes('validation') && (
                <div className="mt-2 p-2 bg-blue-50 rounded">
                  <p className="text-sm text-blue-800">
                    💡 Tip: Check that your JSON file includes all required fields
                    and follows the correct format for FIRS compliance.
                  </p>
                </div>
              )}
            </div>
          )}

          <Tabs defaultValue="sent" className="w-full">
            <div className="flex justify-start mb-4 sm:mb-6 overflow-x-auto">
              <TabsList className="w-auto justify-start min-w-0">
                <TabsTrigger value="sent" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                  <span className="hidden sm:inline">Sent Invoices</span>
                  <span className="sm:hidden">Sent</span>
                  <span className="ml-1">({sentInvoices.length})</span>
                </TabsTrigger>
                <TabsTrigger value="received" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                  <span className="hidden sm:inline">Received Invoices</span>
                  <span className="sm:hidden">Received</span>
                  <span className="ml-1">({receivedInvoices.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="sent">
              {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading invoices...</p>
                  </div>
                </div>
              ) : (
                <InvoiceTable invoices={sentInvoices} type="sent" />
              )}
            </TabsContent>
            
            <TabsContent value="received">
              {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading invoices...</p>
                  </div>
                </div>
              ) : (
                <InvoiceTable invoices={receivedInvoices} type="received" />
              )}
            </TabsContent>
          </Tabs>
        </main>
      ) : (
        // Show loading while checking profile
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      )}

      <UploadDialog
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadSuccess={handleUploadSuccess}
      />

      <ManageMappingsDialog
        open={showManageModal}
        onOpenChange={setShowManageModal}
        getSavedMappings={getSavedMappings}
        clearMappings={clearMappings}
        invoices={sentInvoices}
        onInvoiceUpdate={handleInvoiceUpdate}
      />
    </div>
  );
};

export default Dashboard;