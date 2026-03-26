'use client'
import React, { useEffect, useState } from "react";
import { Invoice, User } from "../type";
import { BusinessModal } from "@/components/modals/BusinessModal";
import { SignupCustomerModal } from "@/components/modals/SignupCustomerModal";
import { UploadDialog } from "@/components/modals/UploadDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EnvironmentSwitch, type Environment } from "@/components/EnvironmentSwitch";
import { InvoiceTable } from "@/components/InvoiceTable";
import { ArrowLeft, Upload } from "lucide-react";
import { updateBusinessId } from "../utils/businessService";
import { getMockCustomersWithInvoices, type CustomerWithInvoices } from "../utils/customerMockData";
import {
  checkBusinessIdCompletion,
  saveUserToStorage,
  saveBusinessIdToStorage,
  clearBusinessIdSkip,
} from "../utils/userUtils";
import { useDashboardUser } from "@/app/(dashboard)/DashboardUserContext";
import { handleUnauthorized } from "../utils/authHelpers";

const AggregatorDashboard = () => {
  const { user, setUser } = useDashboardUser();
  const SELECTED_CUSTOMER_STORAGE_KEY = "aggregatorSelectedCustomerId";
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [businessIdLoading, setBusinessIdLoading] = useState(false);
  const [environment, setEnvironment] = useState<Environment>("sandbox");
  const [customers, setCustomers] = useState<CustomerWithInvoices[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerInvoices, setSelectedCustomerInvoices] = useState<Invoice[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [isLoadingCustomerInvoices, setIsLoadingCustomerInvoices] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const clearSelectedCustomer = () => {
    setSelectedCustomerId("");
    try {
      localStorage.removeItem(SELECTED_CUSTOMER_STORAGE_KEY);
    } catch {
      // ignore remove errors
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('authToken');
    if (!token) handleUnauthorized();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userEnvironment: Environment = user.is_sandbox === false ? "production" : "sandbox";
    setEnvironment(userEnvironment);

    const hasBusinessId = checkBusinessIdCompletion(user);

    if (!hasBusinessId) {
      setShowBusinessModal(true);
      setIsCheckingProfile(false);
      return;
    }

    setIsCheckingProfile(false);
  }, [user]);

  useEffect(() => {
    const loadMockCustomers = async () => {
      setIsLoadingCustomers(true);
      try {
        const mockCustomers = await getMockCustomersWithInvoices();
        setCustomers(mockCustomers);

        // Restore selection after refresh
        let restoredId = "";
        try {
          restoredId = localStorage.getItem(SELECTED_CUSTOMER_STORAGE_KEY) || "";
        } catch {
          restoredId = "";
        }

        const isRestoredValid = restoredId && mockCustomers.some((c) => c.id === restoredId);
        setSelectedCustomerId(isRestoredValid ? restoredId : "");
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    if (!isCheckingProfile) {
      loadMockCustomers();
    }
  }, [isCheckingProfile]);

  // Keep invoices in sync with the selected customer id.
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomerInvoices([]);
      setIsLoadingCustomerInvoices(false);
      return;
    }

    if (!selectedCustomer) {
      // If the selected id is not present in the current customers list,
      // clear it to avoid a blank SelectValue display.
      setSelectedCustomerId("");
      setSelectedCustomerInvoices([]);
      setIsLoadingCustomerInvoices(false);
      return;
    }

    let cancelled = false;
    setIsLoadingCustomerInvoices(true);

    // Simulate fetch delay (later you can replace with real API call)
    const timer = setTimeout(() => {
      if (cancelled) return;
      setSelectedCustomerInvoices(selectedCustomer.invoices);
      setIsLoadingCustomerInvoices(false);
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedCustomer, selectedCustomerId]);

  const handleBusinessIdSubmit = async (businessId: string) => {
    if (!user?.id) {
      alert('User ID not found. Please login again.');
      return;
    }

    setBusinessIdLoading(true);
    try {
      await updateBusinessId(user.id, businessId);

      saveBusinessIdToStorage(businessId);

      const updatedUser: User = { ...user, business_id: businessId };
      saveUserToStorage(updatedUser);
      setUser(updatedUser);

      clearBusinessIdSkip();
      setShowBusinessModal(false);
      setIsCheckingProfile(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update business ID. Please try again.');
    } finally {
      setBusinessIdLoading(false);
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
      <UploadDialog
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        onUploadSuccess={() => {}}
      />
      <SignupCustomerModal open={showSignupModal} onOpenChange={setShowSignupModal} />

      {!isCheckingProfile ? (
        <main className="overflow-x-hidden">
          <section className="bg-[#F8FAFC] border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    {selectedCustomerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSelectedCustomer}
                        className="px-2 text-black"
                        title="Back to customers"
                      >
                        <ArrowLeft className="size-4" />
                      </Button>
                    )}
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                      Aggregator Invoice Management
                    </h2>
                  </div>
                  <p className="text-sm text-slate-600">Select a customer to view invoices</p>
                </div>
                <div className="flex items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                  {!selectedCustomerId ? (
                    <Button className="w-auto text-xs sm:text-sm cursor-pointer" onClick={() => setShowSignupModal(true)}>
                      Sign Up Customers
                    </Button>
                  ) : (
                    <>
                      <div className="flex-shrink-0 flex items-center border border-slate-200 rounded-md px-2 py-1.5 bg-white">
                        <EnvironmentSwitch
                          environment={environment}
                          onEnvironmentChange={setEnvironment}
                        />
                      </div>
                      <Button className="w-auto text-xs sm:text-sm" onClick={() => setShowUploadModal(true)}>
                        <Upload className="size-3 sm:size-4 sm:mr-2" />
                        <span className="hidden sm:inline">Upload Excel</span>
                        <span className="sm:hidden">Upload</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
            {!selectedCustomerId ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-slate-700">Customers</h3>
                {isLoadingCustomers ? (
                  <div className="flex items-center justify-center min-h-[180px]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-secondary mx-auto" />
                      <p className="mt-3 text-sm text-slate-600">Loading customers...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(customer.id);
                          try {
                            localStorage.setItem(SELECTED_CUSTOMER_STORAGE_KEY, customer.id);
                          } catch {
                            // ignore write errors
                          }
                        }}
                        className="text-left bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-300 hover:shadow-sm transition"
                      >
                        <p className="text-sm font-medium text-slate-900">{customer.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{customer.invoices.length} invoice(s)</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 sm:mb-6 max-w-md">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Customers</label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={(customerId) => {
                      setSelectedCustomerId(customerId);
                      try {
                        localStorage.setItem(SELECTED_CUSTOMER_STORAGE_KEY, customerId);
                      } catch {
                        // ignore write errors
                      }
                    }}
                    disabled={isLoadingCustomers}
                  >
                    <SelectTrigger className="text-slate-900 placeholder:text-slate-500 bg-white border-slate-200 [&>span]:text-slate-900">
                      <SelectValue placeholder={isLoadingCustomers ? "Loading customers..." : "Select customer"} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isLoadingCustomerInvoices ? (
                  <div className="flex items-center justify-center min-h-[320px] bg-white border border-slate-200 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto" />
                      <p className="mt-4 text-sm text-slate-600">Loading invoices...</p>
                    </div>
                  </div>
                ) : (
                  <InvoiceTable invoices={selectedCustomerInvoices} type="sent" />
                )}
              </>
            )}
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
    </div>
  );
};

export default AggregatorDashboard;
