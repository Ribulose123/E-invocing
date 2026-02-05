'use client'
import React, { useEffect, useState } from "react";
import { User, Invoice } from "../type";
import { useRouter } from "next/navigation";
import { API_END_POINT } from "../config/Api";
import { InvoiceTable } from "@/components/InvoiceTable";
import { UploadDialog } from "@/components/modals/UploadDialog";
import { BusinessModal } from "@/components/modals/BusinessModal";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, LogOut, Upload, User as UserIcon, ChevronDown, X, Edit } from "lucide-react";
import { EnvironmentSwitch, type Environment } from "@/components/EnvironmentSwitch";
import type { ReceivedInvoice } from "../type";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [sentInvoices, setSentInvoices] = useState<Invoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedInvoice[]>([]);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [businessIdLoading, setBusinessIdLoading] = useState(false);
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [environment, setEnvironment] = useState<Environment>('sandbox');
  const router = useRouter();
  
  // Ensure we're on the client side to avoid hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);


  // Profile Completion Guard
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    const checkProfileCompletion = () => {
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('authToken');
      
      if (!userData || !token) {
        router.push('/');
        return;
      }

      try {
        const userObj = JSON.parse(userData) as any;
        
        // Try to get id from various possible field names
        const userId = userObj.id || userObj.user_id || userObj._id || userObj.ID;
        
        // Ensure user has an id
        if (!userId) {
          router.push('/');
          return;
        }
        
        // Map API response fields to User interface if needed
        const mappedUser: User = {
          id: userId,
          email: userObj.email || '',
          name: userObj.name || '',
          business_id: userObj.business_id || '',
          // Map snake_case to camelCase if API returns snake_case
          companyName: userObj.companyName || userObj.company_name,
          tin: userObj.tin || userObj.tin_number,
          phoneNumber: userObj.phoneNumber || userObj.phone_number,
        };
        
        // Check if business_id is stored separately in localStorage
        const storedBusinessId = localStorage.getItem('userBusinessId');
        if (storedBusinessId && !mappedUser.business_id) {
          mappedUser.business_id = storedBusinessId;
        }
        
        setUser(mappedUser);

        // Check if user has business_id in the stored data
        const hasBusinessIdInData = mappedUser.business_id && mappedUser.business_id.trim() !== '';
        
        // Check if user previously skipped
        const hasSkipped = localStorage.getItem('businessIdSkipped') === 'true';
        
        // Show modal if: no business_id in data AND no stored business_id AND user hasn't skipped
        if (!hasBusinessIdInData && !storedBusinessId && !hasSkipped) {
          // Show modal - don't fetch invoices yet, wait for business_id
          setShowBusinessModal(true);
          setIsCheckingProfile(false); // Allow content to render, but modal will be on top
        } else {
          // User has business_id or skipped, load content
          setIsCheckingProfile(false);
          // Always use user.id for fetching invoices
          fetchInvoices(mappedUser.id);
          fetchReceivedInvoices(mappedUser.id);
        }
      } catch (err) {
        router.push('/');
      }
    };

    // Small delay to ensure localStorage is ready after redirect
    const timeoutId = setTimeout(checkProfileCompletion, 200);
    
    return () => clearTimeout(timeoutId);
  }, [router]);

  const handleBusinessIdSubmit = async (businessId: string) => {
    setBusinessIdLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Authentication token not found. Please login again.');
        setBusinessIdLoading(false);
        return;
      }

      if (!user?.id) {
        alert('User ID not found. Please login again.');
        setBusinessIdLoading(false);
        return;
      }

      // Prepare the update payload
      const updatePayload: any = {
        business_id: businessId,
      };

      // Call API to update business profile - include user ID in the URL
      const response = await fetch(`${API_END_POINT.BUSINESS.UPDATE_BUSINESS}${user.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update business ID');
      }

      const result = await response.json();
      
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
      setIsCheckingProfile(false);
      // Use the user.id to fetch invoices
      fetchInvoices(user.id);
      fetchReceivedInvoices(user.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update business ID. Please try again.');
    } finally {
      setBusinessIdLoading(false);
    }
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

  const handleUpdateProfile = async (profileData: { business_id?: string; tin?: string; companyName?: string; phoneNumber?: string }) => {
    setProfileUpdateLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Authentication token not found. Please login again.');
        setProfileUpdateLoading(false);
        return;
      }

      if (!user?.id) {
        alert('User ID not found. Please login again.');
        setProfileUpdateLoading(false);
        return;
      }

      // Prepare the update payload
      const updatePayload: any = {};

      // Add fields if provided
      if (profileData.business_id) {
        updatePayload.business_id = profileData.business_id;
      }
      if (profileData.tin) {
        updatePayload.tin = profileData.tin;
      }
      if (profileData.companyName) {
        updatePayload.company_name = profileData.companyName;
      }
      if (profileData.phoneNumber) {
        updatePayload.phone_number = profileData.phoneNumber;
      }

      // Call API to update business profile - include user ID in the URL
      const response = await fetch(`${API_END_POINT.BUSINESS.UPDATE_BUSINESS}${user.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const result = await response.json();
      
      // Update userData in localStorage with all profile fields
      if (user) {
        const updatedUserData = {
          ...user,
          business_id: profileData.business_id || user.business_id,
          tin: profileData.tin || user.tin,
          companyName: profileData.companyName || user.companyName,
          phoneNumber: profileData.phoneNumber || user.phoneNumber,
        };
        localStorage.setItem("userData", JSON.stringify(updatedUserData));
        setUser(updatedUserData);
      }
      
      // Close modal
      setShowEditProfileModal(false);
      setShowUserDropdown(false);
      setMessage('Profile updated successfully');
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update profile. Please try again.');
    } finally {
      setProfileUpdateLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Call logout API if token exists
      if (token) {
        try {
          await fetch(API_END_POINT.AUTH.LOGOUT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          })
        } catch (error) {
          // Continue with logout even if API call fails
        }
      }
      
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('userBusinessId');
      localStorage.removeItem('businessIdSkipped');
      localStorage.removeItem('businessIdEntered');
      
      // Redirect to login
      router.push('/');
    } catch (error) {
      // Still clear storage and redirect even on error
      localStorage.clear();
      router.push('/');
    }
  }

  const fetchInvoices = async (businessId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(API_END_POINT.INVOICE.GET_ALL_iNVOICE, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const responseData = await response.json();
        if (responseData && Array.isArray(responseData.data)) {
          setSentInvoices(responseData.data);
        } else if (responseData && responseData.data === null) {
          setSentInvoices([]);
        } else {
          setMessage('Failed to fetch invoices: Invalid data format received.');
          setSentInvoices([]);
        }
      } else {
        setMessage('Failed to fetch invoices');
      }
    } catch (error) {
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
      {/* Profile Completion Modal */}
      <BusinessModal
        isOpen={showBusinessModal}
        onClose={handleSkipBusinessId}
        onSubmit={handleBusinessIdSubmit}
        isLoading={businessIdLoading}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        onSubmit={handleUpdateProfile}
        isLoading={profileUpdateLoading}
        user={user}
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
                    {user.name}
                    {user.business_id && (
                      <span className="ml-2 text-slate-500">• Business ID: {user.business_id}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* User Profile Dropdown */}
              {isClient && user && (
                <div className="relative">
                  <Button
                    variant="ghost"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <UserIcon className="size-4" />
                    <span className="hidden sm:inline">{user.name}</span>
                    <ChevronDown className="size-3" />
                  </Button>
                  
                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <>
                      {/* Backdrop to close dropdown */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowUserDropdown(false)}
                      />
                      {/* Dropdown Content */}
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                        <div className="p-4 border-b border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-900">User Profile</h3>
                            <button
                              onClick={() => setShowUserDropdown(false)}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="bg-[#8B1538] rounded-full p-2">
                              <UserIcon className="size-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{user.name}</p>
                              {user.business_id && (
                                <p className="text-xs text-slate-500">Business ID: {user.business_id}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-slate-500 uppercase">Email</label>
                            <p className="text-sm text-slate-900 mt-1">{user.email}</p>
                          </div>
                          
                          {user.business_id && (
                            <div>
                              <label className="text-xs font-medium text-slate-500 uppercase">Business ID</label>
                              <p className="text-sm text-slate-900 mt-1">{user.business_id}</p>
                            </div>
                          )}
                          
                          {user.tin && (
                            <div>
                              <label className="text-xs font-medium text-slate-500 uppercase">TIN</label>
                              <p className="text-sm text-slate-900 mt-1">{user.tin}</p>
                            </div>
                          )}
                          
                          {user.companyName && (
                            <div>
                              <label className="text-xs font-medium text-slate-500 uppercase">Company Name</label>
                              <p className="text-sm text-slate-900 mt-1">{user.companyName}</p>
                            </div>
                          )}
                          
                          {user.phoneNumber && (
                            <div>
                              <label className="text-xs font-medium text-slate-500 uppercase">Phone Number</label>
                              <p className="text-sm text-slate-900 mt-1">{user.phoneNumber}</p>
                            </div>
                          )}
                          
                          {user.id && (
                            <div>
                              <label className="text-xs font-medium text-slate-500 uppercase">User ID</label>
                              <p className="text-sm text-slate-900 mt-1 font-mono">{user.id}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3 border-t border-slate-200 space-y-2">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setShowEditProfileModal(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full justify-start text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                          >
                            <Edit className="size-4 mr-2" />
                            Edit Profile
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={handleLogout}
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <LogOut className="size-4 mr-2" />
                            Logout
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Logout Button - Only show if dropdown is not shown */}
              {!user && (
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-4"
                >
                  <LogOut className="size-3 sm:size-4 sm:mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              )}
            </div>
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
              {/* Environment Toggle */}
              <div className="flex items-center gap-2 border border-slate-300 rounded-md p-2 sm:p-3 bg-white">
                <EnvironmentSwitch
                  environment={environment}
                  onEnvironmentChange={setEnvironment}
                />
              </div>
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
                {/* <TabsTrigger value="received" className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
                  <span className="hidden sm:inline">Received Invoices</span>
                  <span className="sm:hidden">Received</span>
                  <span className="ml-1">({receivedInvoices.length})</span>
                </TabsTrigger> */}
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
            
            {/* <TabsContent value="received">
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
            </TabsContent> */}
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

    </div>
  );
};

export default Dashboard;