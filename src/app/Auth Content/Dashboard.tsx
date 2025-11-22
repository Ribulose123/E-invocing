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

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
          setInvoices(responseData.data);
        } else {
          setMessage('Failed to fetch invoices: Invalid data format received.');
          setInvoices([]);
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

  const handleUploadSuccess = () => {
    if (user) {
      fetchInvoices(user.id);
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
                <h1 className="text-xl text-slate-900">eInvoice Pro</h1>
                {user && (
                  <p className="text-xs text-slate-600">{user.name} • Email: {user.email}</p>
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
            <TabsList className="mb-6">
              <TabsTrigger value="sent">
                Sent Invoices ({invoices.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="sent">
              {isLoading ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading invoices...</p>
                  </div>
                </div>
              ) : (
                <InvoiceTable invoices={invoices} />
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