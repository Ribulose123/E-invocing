"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/components/ui/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  /** When true, the logo image uses blend mode so a PNG with background blends with the page (e.g. auth gradient). Use on auth screens. */
  blendWithBackground?: boolean;
  /**
   * Prefer an SVG logo at `/image/logo.svg` when available.
   * Falls back to PNG automatically if the SVG file is missing.
   */
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
        src={logoSrc}
        alt="Nexa logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={cn(
          "shrink-0 object-contain",
          // Quick-fix blend mode to help non-transparent PNGs merge into the auth background.
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


