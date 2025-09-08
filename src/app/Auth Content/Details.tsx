"use client";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { InvoiceDetails, User } from "../type";
import Navbar from "./Navbar";
import { API_END_POINT } from "../config/Api";
import Link from "next/link";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Deletion</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete this invoice? This action cannot be undone.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Deleting...' : 'Delete Invoice'}
          </button>
        </div>
      </div>
    </div>
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
    router.push("/login");
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
        return "✅";
      case "pending":
        return "⏳";
      case "failed":
        return "❌";
      default:
        return "📋";
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
        <Navbar user={user} onLogout={handleLogout} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading invoice details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p>Invoice not found</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar user={user} onLogout={handleLogout} />
      
      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg z-50">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span>{successMessage}</span>
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
          <Link
            href="/dashboard"
            className="inline-flex items-center text-red-600 hover:text-red-800"
          >
            ← Back to Invoices
          </Link>
          
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete Invoice
          </button>
        </div>

        {/* Invoice Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Invoice Details
              </h1>
              <p className="text-gray-600">Invoice #{invoice.invoice_number}</p>
              <p className="text-sm text-gray-500">IRN: {invoice.irn}</p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  invoice.current_status
                )}`}
              >
                {invoice.current_status}
              </span>
              <p className="text-sm text-gray-600 mt-1">
                Platform: {invoice.platform}
              </p>
            </div>
          </div>
        </div>

        {/* Status History Timeline */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Status History
          </h2>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-300"></div>

            <div className="space-y-8">
              {invoice.status_history &&
                invoice.status_history.map((history, index) => (
                  <div key={index} className="relative pl-12">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        history.status === "success"
                          ? "bg-green-500"
                          : history.status === "failed"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    >
                      <span className="text-white text-sm font-bold">
                        {getStatusIcon(history.status)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {formatStepName(history.step)}
                          </h3>
                          <p
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              history.status
                            )}`}
                          >
                            {history.status.toUpperCase()}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(history.timestamp)}
                        </span>
                      </div>

                      {/* Additional details based on step */}
                      {history.step === "validated_invoice" &&
                        history.status === "failed" && (
                          <div className="mt-2 p-2 bg-red-50 rounded">
                            <p className="text-sm text-red-700">
                              Validation failed. Please check your invoice data
                              and try again.
                            </p>
                          </div>
                        )}

                      {history.step === "signed_invoice" &&
                        history.status === "pending" && (
                          <div className="mt-2 p-2 bg-blue-50 rounded">
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
        </div>

        {/* Invoice Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Basic Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Invoice Information
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Invoice Number:
                </span>
                <p className="text-gray-900">{invoice.invoice_number}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">IRN:</span>
                <p className="text-gray-900">{invoice.irn}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Current Status:
                </span>
                <p className="text-gray-900">{invoice.current_status}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Created At:
                </span>
                <p className="text-gray-900">
                  {formatDate(invoice.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Progress Summary
            </h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Total Steps:
                </span>
                <p className="text-gray-900">
                  {invoice.status_history?.length || 0}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Completed Steps:
                </span>
                <p className="text-gray-900">
                  {invoice.status_history?.filter((h) => h.status === "success")
                    .length || 0}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Pending Steps:
                </span>
                <p className="text-gray-900">
                  {invoice.status_history?.filter((h) => h.status === "pending")
                    .length || 0}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Failed Steps:
                </span>
                <p className="text-gray-900">
                  {invoice.status_history?.filter((h) => h.status === "failed")
                    .length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Status Alert */}
        {invoice.current_status === "validated_invoice" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-yellow-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
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
          </div>
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