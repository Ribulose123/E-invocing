'use client'
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileText } from 'lucide-react';

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg max-h-[90vh] rounded-xl bg-white shadow-2xl border border-secondary/20 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50 rounded-t-xl">
          <h3 className="text-lg font-semibold text-gray-900">Complete Your Profile</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          {/* Scrollable body */}
          <div className="p-6 overflow-y-auto min-h-0">
            <div className="mb-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-center text-base font-semibold text-gray-900 mb-1">
                One Last Step
              </h4>
              <p className="text-center text-sm text-gray-600">
                Please provide your Business ID to complete your profile setup.
              </p>
            </div>
          
            <div className="space-y-6">
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
                  className="text-secondary hover:underline"
                >
                  https://einvoice.firs.gov.ng/enablement
                </a>
              </p>
              </div>
            
              <div className="bg-secondary/10 border border-secondary/20 rounded-md p-3">
              <p className="text-xs text-slate-700">
                💡 <strong>Where to find your Business ID?</strong><br />
                • Check your welcome email<br />
                • Look in your account settings<br />
                • Contact your administrator
              </p>
            </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 pt-4 border-t border-slate-200 bg-white rounded-b-xl">
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full h-12"
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
          </div>
          </div>
        </form>
      </div>
    </div>
  );
};


