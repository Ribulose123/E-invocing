"use client";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { InvoiceDetails, User } from "../type";
import { API_END_POINT } from "../config/Api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Trash2, CheckCircle2, Clock, XCircle, AlertCircle, FileText, LogOut } from "lucide-react";

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  isLoading: boolean;
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this invoice? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Details = () => {
  const params = useParams();
  const invoiceId = params.id as string;
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const userData = localStorage.getItem("userData");
    const token = localStorage.getItem("authToken");

    if (!userData || !token) {
      router.push("/");
      return;
    }

    try {
      const userObj = JSON.parse(userData) as User;
      setUser(userObj);
      fetchInvoiceDetails(userObj.id, invoiceId);
    } catch (err) {
      console.error("Error parsing user data:", err);
      router.push("/");
    }
  }, [router, invoiceId]);

  const fetchInvoiceDetails = async (businessId: string, invoiceId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        API_END_POINT.INVOICE.GET_INVOICE_DETAILS.replace(
          "{business_id}",
          businessId
        ).replace("{invoice_id}", invoiceId),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        setInvoice(responseData.data);
      } else {
        setError("Failed to fetch invoice details");
      }
    } catch (err) {
      console.error("Error fetching invoice details:", err);
      setError("Error fetching invoice details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!user || !invoice) return;
    
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        API_END_POINT.INVOICE.DELETE_INVOICE
          .replace("{business_id}", user.id)
          .replace("{invoice_id}", invoice.id),
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setSuccessMessage("Invoice deleted successfully!");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to delete invoice");
      }
    } catch (err) {
      console.error("Error deleting invoice:", err);
      setError("Error deleting invoice. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    router.push("/");
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case "success":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return <CheckCircle2 className="size-3" />;
      case "pending":
        return <Clock className="size-3" />;
      case "failed":
        return <XCircle className="size-3" />;
      default:
        return <AlertCircle className="size-3" />;
    }
  };

  const formatStepName = (step: string) => {
    return step
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (isLoading) {
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
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B1538] mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading invoice details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
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
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md">
                <p className="font-semibold mb-2">Error</p>
                <p>{error}</p>
                <Button
                  variant="destructive"
                  onClick={() => router.push("/dashboard")}
                  className="mt-4"
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!invoice) {
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
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Card className="border-yellow-400">
            <CardContent className="pt-6">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
                <p className="font-semibold mb-2">Invoice not found</p>
                <p>The invoice you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  className="mt-4"
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
      
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-lg z-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-green-600" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteInvoice}
        isLoading={isDeleting}
      />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Back Button and Delete Button */}
        <div className="mb-6 flex justify-between items-center">
          <Button variant="ghost" asChild>
            <Link href="/dashboard" className="inline-flex items-center gap-2">
              <ArrowLeft className="size-4" />
              Back to Invoices
            </Link>
          </Button>
          
          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="size-4 mr-2" />
            Delete Invoice
          </Button>
        </div>

        {/* Invoice Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">Invoice Details</CardTitle>
                <p className="text-slate-600 mt-1">Invoice #{invoice.invoice_number}</p>
                <p className="text-sm text-slate-500 mt-1">IRN: {invoice.irn}</p>
              </div>
              <div className="text-right">
                <Badge variant={getStatusVariant(invoice.current_status)} className="mb-2">
                  {getStatusIcon(invoice.current_status)}
                  {invoice.current_status}
                </Badge>
                <p className="text-sm text-slate-600 mt-1">
                  Platform: {invoice.platform}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Status History Timeline */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Status History</CardTitle>
          </CardHeader>
          <CardContent>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 h-full w-0.5 bg-slate-300"></div>

              <div className="space-y-8">
                {invoice.status_history &&
                  invoice.status_history.map((history, index) => (
                    <div key={index} className="relative pl-12">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          history.status === "success"
                            ? "bg-primary"
                            : history.status === "failed"
                            ? "bg-destructive"
                            : "bg-secondary"
                        }`}
                      >
                        <span className="text-white">
                          {getStatusIcon(history.status)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {formatStepName(history.step)}
                            </h3>
                            <Badge 
                              variant={getStatusVariant(history.status)} 
                              className="mt-2"
                            >
                              {getStatusIcon(history.status)}
                              {history.status.toUpperCase()}
                            </Badge>
                          </div>
                          <span className="text-sm text-slate-500">
                            {formatDate(history.timestamp)}
                          </span>
                        </div>

                        {/* Additional details based on step */}
                        {history.step === "validated_invoice" &&
                          history.status === "failed" && (
                            <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                              <p className="text-sm text-destructive">
                                Validation failed. Please check your invoice data
                                and try again.
                              </p>
                            </div>
                          )}

                        {history.step === "signed_invoice" &&
                          history.status === "pending" && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                              <p className="text-sm text-blue-700">
                                Waiting for digital signature processing...
                              </p>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-slate-500">
                    Invoice Number:
                  </span>
                  <p className="text-slate-900 font-medium">{invoice.invoice_number}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500">IRN:</span>
                  <p className="text-slate-900 font-medium">{invoice.irn}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500">
                    Current Status:
                  </span>
                  <div className="mt-1">
                    <Badge variant={getStatusVariant(invoice.current_status)}>
                      {getStatusIcon(invoice.current_status)}
                      {invoice.current_status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500">
                    Created At:
                  </span>
                  <p className="text-slate-900 font-medium">
                    {formatDate(invoice.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Progress Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-slate-500">
                    Total Steps:
                  </span>
                  <p className="text-slate-900 font-medium text-lg">
                    {invoice.status_history?.length || 0}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500">
                    Completed Steps:
                  </span>
                  <p className="text-slate-900 font-medium text-lg">
                    {invoice.status_history?.filter((h) => h.status === "success")
                      .length || 0}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500">
                    Pending Steps:
                  </span>
                  <p className="text-slate-900 font-medium text-lg">
                    {invoice.status_history?.filter((h) => h.status === "pending")
                      .length || 0}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-500">
                    Failed Steps:
                  </span>
                  <p className="text-slate-900 font-medium text-lg">
                    {invoice.status_history?.filter((h) => h.status === "failed")
                      .length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Status Alert */}
        {invoice.current_status === "validated_invoice" && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="size-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-yellow-800">
                    Attention Required
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This invoice requires attention. Please check the status
                      history for details.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw Data (for debugging) */}
       {/*  <details className="bg-gray-50 rounded-lg p-4 mb-6">
          <summary className="cursor-pointer font-medium text-gray-700">
            View Raw Data (Debug)
          </summary>
          <pre className="mt-2 p-4 bg-gray-100 rounded overflow-x-auto text-sm">
            {JSON.stringify(invoice, null, 2)}
          </pre>
        </details> */}
      </div>
    </div>
  );
};

export default Details;