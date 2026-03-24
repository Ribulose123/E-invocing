'use client'
import React, { useEffect, useState, useCallback } from "react";
import { User, Invoice } from "../type";
import { InvoiceTable } from "@/components/InvoiceTable";
import { UploadDialog } from "@/components/modals/UploadDialog";
import { BusinessModal } from "@/components/modals/BusinessModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload } from "lucide-react";
import { EnvironmentSwitch, type Environment } from "@/components/EnvironmentSwitch";
import type { ReceivedInvoice } from "../type";
import { fetchInvoices } from "../utils/invoiceService";
import { getMockReceivedInvoices } from "../utils/mockData";
import { updateBusinessId } from "../utils/businessService";
import { API_END_POINT } from "../config/Api";
import {
  checkBusinessIdCompletion,
  saveUserToStorage,
  saveBusinessIdToStorage,
  clearBusinessIdSkip,
} from "../utils/userUtils";
import { useDashboardUser } from "@/app/(dashboard)/DashboardUserContext";
import { handleUnauthorized } from "../utils/authHelpers";

const Dashboard = () => {
  const { user, setUser } = useDashboardUser();
  const [sentInvoices, setSentInvoices] = useState<Invoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<ReceivedInvoice[]>([]);
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [businessIdLoading, setBusinessIdLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [environment, setEnvironment] = useState<Environment>('sandbox');
  const [isTogglingEnvironment, setIsTogglingEnvironment] = useState(false);

  const getBusinessIdForInvoices = (u: User | null): string => {
    if (!u) return '';
    return (
      (u.business_id && u.business_id.trim()) ||
      localStorage.getItem('userBusinessId') ||
      ''
    );
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('authToken');
    if (!token) handleUnauthorized();
  }, []);

  // ── Load invoices — reads token from localStorage at call time ─────────────
  const loadInvoices = useCallback(async (businessId: string) => {
    if (!businessId) {
      setSentInvoices([]);
      setReceivedInvoices([]);
      setMessage('Please enter your Business ID to view invoices.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const [invoices, received] = await Promise.all([
        fetchInvoices(businessId).catch(() => {
          setMessage('Error fetching invoices');
          return [] as Invoice[];
        }),
        getMockReceivedInvoices().catch(() => [] as ReceivedInvoice[]),
      ]);
      setSentInvoices(invoices);
      setReceivedInvoices(received);
    } catch {
      setMessage('Error loading invoices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Profile check on mount / user change ───────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const userEnvironment: Environment = user.is_sandbox === false ? 'production' : 'sandbox';
    setEnvironment(userEnvironment);

    const hasBusinessId = checkBusinessIdCompletion(user);

    if (!hasBusinessId) {
      setShowBusinessModal(true);
      setIsCheckingProfile(false);
      return;
    }

    setIsCheckingProfile(false);
    const businessId = getBusinessIdForInvoices(user);
    loadInvoices(businessId);
  }, [user, loadInvoices]);

  // ── Business ID submission ─────────────────────────────────────────────────
  const handleBusinessIdSubmit = async (businessId: string) => {
    if (!user?.id) {
      alert('User ID not found. Please login again.');
      return;
    }

    setBusinessIdLoading(true);
    try {
      await updateBusinessId(user.id, businessId);

      saveBusinessIdToStorage(businessId);

      const updatedUser = { ...user, business_id: businessId };
      saveUserToStorage(updatedUser);
      setUser(updatedUser);

      clearBusinessIdSkip();
      setShowBusinessModal(false);
      setIsCheckingProfile(false);
      loadInvoices(getBusinessIdForInvoices(updatedUser));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update business ID. Please try again.');
    } finally {
      setBusinessIdLoading(false);
    }
  };

  // ── Upload success ─────────────────────────────────────────────────────────
  const handleUploadSuccess = () => {
    const businessId = getBusinessIdForInvoices(user);
    if (!businessId) {
      setMessage('Please enter your Business ID to refresh invoices after upload.');
      return;
    }
    loadInvoices(businessId);
  };

  // ── Environment toggle ─────────────────────────────────────────────────────

  // ── Environment toggle ─────────────────────────────────────────────────────
const handleEnvironmentChange = async (newEnvironment: Environment) => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    setMessage('Authentication token not found. Please login again.');
    return;
  }

  setIsTogglingEnvironment(true);
  setMessage('');

  try {
    const response = await fetch(API_END_POINT.AUTH.SANDBOX_PRODUCTION_MODE, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to toggle application mode');
    }
    if (result.data?.access_token) {
      localStorage.setItem('authToken', result.data.access_token);
    }
    if (result.data?.data) {
      const currentBusinessId = getBusinessIdForInvoices(user);
      
      const updatedUser: User = {
        ...user!,
        ...result.data.data,
        business_id: result.data.data.business_id || currentBusinessId,
        is_sandbox: result.data.data.is_sandbox,
      };
      
      saveUserToStorage(updatedUser);
      setUser(updatedUser);
      
      if (currentBusinessId) {
        saveBusinessIdToStorage(currentBusinessId);
      }
    }
        
  /*   setMessage(`Switching to ${newEnvironment === 'sandbox' ? 'Sandbox' : 'Production'} mode...`); */
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
  } catch (error) {
    setMessage(
      error instanceof Error
        ? error.message
        : 'Failed to toggle application mode. Please try again.'
    );
    setTimeout(() => setMessage(''), 5000);
    setIsTogglingEnvironment(false);
  }
};
  return (
    <div className="min-h-screen bg-slate-50">
      <BusinessModal
        isOpen={showBusinessModal}
        onClose={() => {}}
        onSubmit={handleBusinessIdSubmit}
        isLoading={businessIdLoading}
      />

      {!isCheckingProfile ? (
        <main className="overflow-x-hidden">
          {/* Header */}
          <section className="bg-[#F8FAFC] border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="w-full sm:w-auto">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                    Invoice Management
                  </h2>
                  <p className="text-sm text-slate-600">View and manage your invoices</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="flex-shrink-0 flex items-center border border-slate-200 rounded-md px-2 py-1.5 bg-white">
                    <EnvironmentSwitch
                      environment={environment}
                      onEnvironmentChange={handleEnvironmentChange}
                      disabled={isTogglingEnvironment}
                    />
                  </div>
                  <Button
                    onClick={() => setShowUploadModal(true)}
                    className="w-auto text-xs sm:text-sm"
                    disabled={isTogglingEnvironment}
                  >
                    <Upload className="size-3 sm:size-4 sm:mr-2" />
                    <span className="hidden sm:inline">Upload Excel</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Body */}
          <section className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">

            {/* Environment switching overlay */}
            {/* {isTogglingEnvironment && (
              <div className="mb-4 p-4 rounded-md bg-blue-50 border border-blue-200 flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Switching to{' '}
                  <span className="font-semibold capitalize">{environment === 'sandbox' ? 'Production' : 'Sandbox'}</span>{' '}
                  environment and refreshing invoices…
                </p>
              </div>
            )} */}

            {message && (
              <div
                className={`mb-4 p-4 rounded-md ${
                  message.includes('success')
                    ? 'bg-green-100 text-green-800 border border-green-400'
                    : 'bg-red-100 text-red-800 border border-red-400'
                }`}
              >
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

                {message.includes('duplicate') && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded">
                    <p className="text-sm text-yellow-800">
                      💡 Tip: Ensure each invoice has a unique invoice number. If this is a retry,
                      wait a few minutes before trying again.
                    </p>
                  </div>
                )}

                {message.includes('validation') && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <p className="text-sm text-blue-800">
                      💡 Tip: Check that your JSON file includes all required fields and follows the
                      correct format for FIRS compliance.
                    </p>
                  </div>
                )}
              </div>
            )}

            <Tabs defaultValue="sent" className="w-full">
              <div className="flex justify-start mb-4 sm:mb-6 overflow-x-auto">
                <TabsList className="w-auto justify-start min-w-0">
                  <TabsTrigger
                    value="sent"
                    className="text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap"
                  >
                    <span className="hidden sm:inline">Sent Invoices</span>
                    <span className="sm:hidden">Sent</span>
                    <span className="ml-1">({sentInvoices.length})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="sent">
                {isLoading ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto" />
                      <p className="mt-4 text-gray-600">
                        {isTogglingEnvironment ? 'Switching environment…' : 'Loading invoices...'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <InvoiceTable invoices={sentInvoices} type="sent" />
                )}
              </TabsContent>
            </Tabs>
          </section>
        </main>
      ) : (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto" />
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