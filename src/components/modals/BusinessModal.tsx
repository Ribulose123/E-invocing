'use client'
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText, X } from 'lucide-react';

interface BusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (businessId: string) => void;
  isLoading: boolean;
}

export const BusinessModal: React.FC<BusinessModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading 
}) => {
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
              <p className="text-xs text-gray-500 mt-2">
                If you have generated your business id from irs please use this link to generate your id:{' '}
                <a 
                  href="https://einvoice.firs.gov.ng/enablement" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://einvoice.firs.gov.ng/enablement
                </a>
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


