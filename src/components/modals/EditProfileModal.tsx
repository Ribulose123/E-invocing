'use client'
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, X } from 'lucide-react';
import { User as UserType } from '@/app/type';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { business_id?: string; tin?: string; companyName?: string; phoneNumber?: string }) => Promise<void>;
  isLoading: boolean;
  user: UserType | null;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading,
  user
}) => {
  const [businessId, setBusinessId] = useState('');
  const [tin, setTin] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Update state when user data changes
  useEffect(() => {
    if (user && isOpen) {
      setBusinessId(user.business_id || '');
      setTin(user.tin || '');
      setCompanyName(user.companyName || '');
      setPhoneNumber(user.phoneNumber || '');
    }
  }, [user, isOpen]);
  
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updateData: { business_id?: string; tin?: string; companyName?: string; phoneNumber?: string } = {};
    
    if (businessId.trim()) {
      updateData.business_id = businessId.trim();
    }
    if (tin.trim()) {
      updateData.tin = tin.trim();
    }
    if (companyName.trim()) {
      updateData.companyName = companyName.trim();
    }
    if (phoneNumber.trim()) {
      updateData.phoneNumber = phoneNumber.trim();
    }
    
    await onSubmit(updateData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
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
              <User className="h-8 w-8 text-primary" />
            </div>
            <h4 className="text-center text-lg font-medium text-gray-900 mb-2">
              Update Your Profile
            </h4>
            <p className="text-center text-sm text-gray-600 mb-4">
              Update your business information below.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-id" className="text-sm font-medium">
                Business ID
              </Label>
              <Input
                id="business-id"
                type="text"
                placeholder="e.g., BIZ-12345"
                value={businessId}
                onChange={(e) => setBusinessId(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tin" className="text-sm font-medium">
                TIN
              </Label>
              <Input
                id="tin"
                type="text"
                placeholder="e.g., 12345678-0001"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-sm font-medium">
                Company Name
              </Label>
              <Input
                id="company-name"
                type="text"
                placeholder="e.g., Your Business Ltd"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-number" className="text-sm font-medium">
                Phone Number
              </Label>
              <Input
                id="phone-number"
                type="tel"
                placeholder="e.g., +234 123 456 7890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isLoading}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="mt-6 flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                'Update Profile'
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

