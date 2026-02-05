"use client";

import * as React from "react";
import { cn } from "@/components/ui/utils";

export type Environment = 'sandbox' | 'production';

interface EnvironmentSwitchProps {
  environment: Environment;
  onEnvironmentChange: (environment: Environment) => void;
  disabled?: boolean;
  className?: string;
}

export function EnvironmentSwitch({
  environment,
  onEnvironmentChange,
  disabled = false,
  className,
}: EnvironmentSwitchProps) {
  const isProduction = environment === 'production';
  const displayText = isProduction ? 'Production' : 'Sandbox';

  const handleClick = () => {
    if (!disabled) {
      onEnvironmentChange(isProduction ? 'sandbox' : 'production');
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isProduction}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "relative inline-flex h-9 w-36 sm:w-40 items-center rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1538] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 px-1",
        isProduction ? "bg-[#8B1538]" : "bg-slate-300",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-[calc(50%-0.25rem)] items-center justify-center transform rounded-full bg-white transition-all duration-300 shadow-sm text-xs sm:text-sm font-medium whitespace-nowrap",
          isProduction ? "translate-x-[calc(100%+0.25rem)] text-[#8B1538]" : "translate-x-0 text-slate-600"
        )}
      >
        {displayText}
      </span>
    </button>
  );
}

