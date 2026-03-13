"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/components/ui/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  blendWithBackground?: boolean;

  preferSvg?: boolean;
}

export function BrandLogo({
  className,
  size = 80,
  showText = true,
  blendWithBackground = false,
  preferSvg = true,
}: BrandLogoProps) {
  const [svgFailed, setSvgFailed] = React.useState(false);
  const logoSrc = preferSvg && !svgFailed ? "/image/logo.svg" : "/image/logo.png";

  return (
    <div className={cn("flex items-center gap-2 bg-transparent", className)}>
      <Image
        src='/image/Nexar_logo_transparent.png'
        alt="Nexa logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={cn(
          "w-1",
          // Quick-fix blend mo to help non-transparent PNGs merge into the auth background.
          blendWithBackground && "mix-blend-screen"
        )}
        onError={() => setSvgFailed(true)}
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


