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
    
     
    </div>
  );
}


