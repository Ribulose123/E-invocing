"use client";

import * as React from "react";
import { cn } from "./utils";

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  className,
  label,
}: SwitchProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B1538] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-[#8B1538]" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export { Switch };

