"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/app/type";
import { parseUserFromStorage } from "@/app/utils/userUtils";

type DashboardUserContextValue = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthChecked: boolean;
};

const DashboardUserContext = createContext<DashboardUserContextValue | null>(null);

export function useDashboardUser(): DashboardUserContextValue {
  const ctx = useContext(DashboardUserContext);
  if (!ctx) {
    throw new Error("useDashboardUser must be used within DashboardLayoutClient");
  }
  return ctx;
}

export function DashboardUserProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("userData");
    if (!userData || !token) {
      router.replace("/");
      return;
    }
    const parsed = parseUserFromStorage();
    setUserState(parsed);
    setIsAuthChecked(true);
  }, [router]);

  const value: DashboardUserContextValue = {
    user,
    setUser: setUserState,
    isAuthChecked,
  };

  return (
    <DashboardUserContext.Provider value={value}>
      {children}
    </DashboardUserContext.Provider>
  );
}
