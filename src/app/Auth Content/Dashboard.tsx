'use client'
import React, { useEffect, useState } from "react";
import { InvoiceFormData, User, Invoice } from "../type";
import { useRouter } from "next/navigation";
import WelcomeModal from "../modals/WelcomeModal ";
import Navbar from "./Navbar";
import { API_END_POINT } from "../config/Api";
import UploadSection from "./UploadSection";
import InvoiceUploadModal from "../modals/InvoiceUploadModal";
import InvoiceList from "./InvoiceList";

interface ApiErrorResponse {
  status: string;
  status_code: number;
  message: string;
  error?: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false); // New state
  const [message, setMessage] = useState("");
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState<string>("");
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

  const handleInvoiceUpload = async (data: InvoiceFormData) => {
    if (!user) return;

    if (lastInvoiceNumber === data.invoice_number) {
      setMessage('This invoice appears to be a duplicate. Please verify or use a different invoice number.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();

      formData.append('file', data.file[0]);
      formData.append('business_id', user.id);
      formData.append('invoice_number', data.invoice_number);

      const response = await fetch(API_END_POINT.INVOICE.CREAT_INVOICE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        setMessage('Invoice uploaded successfully!');
        setLastInvoiceNumber(data.invoice_number);
        setShowUploadModal(false);
        // Refresh invoices after successful upload
        fetchInvoices(user.id);
      } else {
        try {
          const errorData: ApiErrorResponse = await response.json();
          setMessage(errorData.message || errorData.error || 'Failed to upload invoice');

          if (errorData.message?.includes('duplicate') || errorData.error?.includes('duplicate')) {
            setLastInvoiceNumber(data.invoice_number);
          }
        } catch {
          setMessage(`Server error: ${response.status} ${response.statusText}`);
        }
      }
    } catch (err) {
      console.error('Network error:', err);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} onLogout={handleLogout} />

      <WelcomeModal
        userName={user?.name ?? ""}
        isOpen={showWelcomeModal}
        onClose={handleWelcomeComplete} // Updated to use the new handler
      />

      <InvoiceUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleInvoiceUpload}
        isLoading={isLoading}
      />

      {/* Only show content after user clicks "Get Started" */}
      {isContentLoaded ? (
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <UploadSection onUploadClick={() => setShowUploadModal(true)} />

          {/* Display messages */}
          {message && (
            <div className={`mt-4 p-4 rounded-md ${
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

          <InvoiceList
            invoices={invoices}
            isLoading={isLoading}
          />
        </main>
      ) : (
        showWelcomeModal ? null : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your dashboard...</p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default Dashboard;