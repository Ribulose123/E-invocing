'use client'
import React, { useEffect, useState } from "react";
import { User, Invoice } from "../type";
import { useRouter } from "next/navigation";
import WelcomeModal from "../modals/WelcomeModal ";
import { API_END_POINT } from "../config/Api";
import { InvoiceTable } from "@/components/InvoiceTable";
import { UploadDialog } from "@/components/UploadDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, LogOut, Upload } from "lucide-react";
import type { ReceivedInvoice } from "../type";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sentInvoices, setSentInvoices] = useState<Invoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedInvoice[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false); 
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');
    
    if (!userData || !token) {
      router.push('/login');
      return;
    }

    try {
      const userObj = JSON.parse(userData) as User;
      setUser(userObj);

      // Check if the welcome modal has already been shown
      const welcomeModalShown = localStorage.getItem('welcomeModalShown');
      if (!welcomeModalShown) {
        setShowWelcomeModal(true);
        localStorage.setItem('welcomeModalShown', 'true');
      } else {
        // If welcome modal was already shown, load content immediately
        setIsContentLoaded(true);
        fetchInvoices(userObj.id);
        fetchReceivedInvoices(userObj.id);
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
      router.push('/');
    }
  }, [router]);

  const handleWelcomeComplete = () => {
    setShowWelcomeModal(false);
    setIsContentLoaded(true);
    if (user) {
      fetchInvoices(user.id);
      fetchReceivedInvoices(user.id);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('welcomeModalShown');
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-[#8B1538] p-2 rounded-lg">
                <FileText className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl text-slate-900">
                Gention E-invoice</h1>
                {user && (
                  <p className="text-xs text-slate-600">{user.name} • TIN: 123456-0001</p>
                )}
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <WelcomeModal
        userName={user?.name ?? ""}
        isOpen={showWelcomeModal}
        onClose={handleWelcomeComplete}
      />

      {/* Only show content after user clicks "Get Started" */}
      {isContentLoaded ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl text-slate-900">Invoice Management</h2>
              <p className="text-slate-600">View and manage your invoices</p>
            </div>
            <Button onClick={() => setShowUploadModal(true)}>
              <Upload className="size-4 mr-2" />
              Upload Excel
            </Button>
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
            <div className="flex justify-start mb-6">
              <TabsList className="w-auto justify-start">
                <TabsTrigger value="sent">
                  Sent Invoices ({sentInvoices.length})
                </TabsTrigger>
                <TabsTrigger value="received">
                  Received Invoices ({receivedInvoices.length})
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
        showWelcomeModal ? null : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        )
      )}

      <UploadDialog
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default Dashboard;