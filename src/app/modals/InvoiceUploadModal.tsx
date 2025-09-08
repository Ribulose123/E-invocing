import React from "react";
import { InvoiceFormData } from "../type";
import { useForm } from "react-hook-form";

interface InvoiceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => void;
  isLoading: boolean;
}
const InvoiceUploadModal = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: InvoiceUploadModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InvoiceFormData>();

  const handleClose = () => {
    reset();
    onClose();
  };

  const formSumbit = (data: InvoiceFormData) => {
    onSubmit(data);
    reset();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/75 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg leading-6 font-medium text-gray-900 text-center">
            Upload Invoice
          </h3>
          <form onSubmit={handleSubmit(formSumbit)} className="space-y-4 mt-4">
            <div>
              <label
                htmlFor="invoice_number"
                className="block text-sm font-medium text-gray-700"
              >
                Invoice Number
              </label>
              <input
                {...register("invoice_number", {
                  required: "Invoice number is required",
                })}
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500"
                placeholder="Enter invoice number"
              />
              {errors.invoice_number && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.invoice_number.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="file"
                className="block text-sm font-medium text-gray-700"
              >
                Invoice File
              </label>
              <input
                {...register("file", { required: "File is required" })}
                type="file"
                accept=".json"
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              />
              {errors.file && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.file.message}
                </p>
              )}
            </div>
            <div className="flex space-x-3 pt-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InvoiceUploadModal;
