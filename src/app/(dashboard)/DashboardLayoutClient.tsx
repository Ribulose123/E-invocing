"use client";

import React, { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { EditProfileModal } from "@/components/modals/EditProfileModal";
import { DashboardUserProvider, useDashboardUser } from "./DashboardUserContext";
import { updateBusinessProfile, getBusinessProfile } from "@/app/utils/businessService";
import { saveUserToStorage } from "@/app/utils/userUtils";

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, setUser, isAuthChecked } = useDashboardUser();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [profileUpdateLoading, setProfileUpdateLoading] = useState(false);
  const [profileFetchLoading, setProfileFetchLoading] = useState(false);

  const handleOpenEditProfile = useCallback(async () => {
    if (!user?.id) return;
    setProfileFetchLoading(true);
    try {
      const profile = await getBusinessProfile(user.id);
      const mergedUser = {
        ...user,
        business_id: profile.business_id ?? user.business_id ?? "",
        tin: profile.tin ?? user.tin,
        companyName: [profile.company_name, profile.companyName, user.companyName].find((v): v is string => typeof v === "string"),
        phoneNumber: [profile.phone_number, profile.phoneNumber, user.phoneNumber].find((v): v is string => typeof v === "string"),
      };
      setUser(mergedUser);
      saveUserToStorage(mergedUser);
      setShowEditProfileModal(true);
    } catch {
      setShowEditProfileModal(true);
    } finally {
      setProfileFetchLoading(false);
    }
  }, [user, setUser]);

  const handleUpdateProfile = useCallback(
    async (profileData: {
      business_id?: string;
      tin?: string;
      companyName?: string;
      phoneNumber?: string;
    }) => {
      if (!user?.id) {
        alert("User ID not found. Please login again.");
        return;
      }
      setProfileUpdateLoading(true);
      try {
        const updatePayload: Record<string, string> = {};
        if (profileData.business_id) updatePayload.business_id = profileData.business_id;
        if (profileData.tin) updatePayload.tin = profileData.tin;
        if (profileData.companyName) updatePayload.company_name = profileData.companyName;
        if (profileData.phoneNumber) updatePayload.phone_number = profileData.phoneNumber;
        await updateBusinessProfile(user.id, updatePayload);
        const updatedUser = {
          ...user,
          business_id: profileData.business_id ?? user.business_id,
          tin: profileData.tin ?? user.tin,
          companyName: profileData.companyName ?? user.companyName,
          phoneNumber: profileData.phoneNumber ?? user.phoneNumber,
        };
        saveUserToStorage(updatedUser);
        setUser(updatedUser);
        setShowEditProfileModal(false);
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Failed to update profile. Please try again."
        );
      } finally {
        setProfileUpdateLoading(false);
      }
    },
    [user, setUser]
  );

  const handleLogout = useCallback(() => {
    // Navbar handles storage clear and redirect; this is a no-op for layout
  }, []);

  if (!isAuthChecked || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <EditProfileModal
        isOpen={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        onSubmit={handleUpdateProfile}
        isLoading={profileUpdateLoading}
        user={user}
      />
      <Navbar
        user={user}
        onEditProfile={handleOpenEditProfile}
        onLogout={handleLogout}
      />
      {children}
    </>
  );
}

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <DashboardUserProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </DashboardUserProvider>
  );
}
