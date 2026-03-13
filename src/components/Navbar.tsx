"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, ChevronDown, X, Edit } from "lucide-react";
import { User } from "@/app/type";
import { API_END_POINT } from "@/app/config/Api";
import { BrandLogo } from "@/components/BrandLogo";

interface NavbarProps {
  user: User | null;
  onEditProfile: () => void;
  onLogout: () => void;
}

export function Navbar({ user, onEditProfile, onLogout }: NavbarProps) {
  const [isClient, setIsClient] = React.useState(false);
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          await fetch(API_END_POINT.AUTH.LOGOUT, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
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
      
      // Call the parent's logout handler
      onLogout();
      
      // Redirect to login
      router.push('/');
    } catch (error) {
      // Still clear storage and redirect even on error
      localStorage.clear();
      router.push('/');
    }
  };

  return (
    <header className="bg-primary border-b border-secondary/30 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 py-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <BrandLogo className="min-w-0" />
          </div>
          <div className="flex items-center gap-2">
            {/* User Profile Dropdown */}
            {isClient && user && (
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-3 text-white hover:text-white hover:bg-white/10"
                >
                 {/*  <UserIcon className="size-4" /> */}
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
                          <div className="bg-secondary rounded-full p-2">
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
                            onEditProfile();
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
  );
}

