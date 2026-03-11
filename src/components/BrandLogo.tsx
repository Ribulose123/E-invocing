"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/components/ui/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function BrandLogo({ className, size = 80, showText = true }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/image/logo.png"
        alt="Nexa logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0"
        priority
      />
      {showText && (
        <div className="leading-tight">
          <div className="text-lg sm:text-xl font-semibold text-white">Nexa E-invoice</div>
          <div className="text-xs sm:text-sm text-secondary/90">Digital Invoice Management</div>
        </div>
      )}
    </div>
  );
}


