"use client";
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
  const otherEnvironment = isProduction ? 'Sandbox' : 'Production';

  const handleClick = () => {
    if (!disabled) {
      onEnvironmentChange(isProduction ? 'sandbox' : 'production');
    }
  };

  return (
    <div className="relative group">
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
      
      {/* Tooltip */}
      <div className="absolute  left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
        <div className="text-center">
          <div className="font-medium">Current: {displayText}</div>
          <div className="text-slate-300 mt-0.5">Click to change to {otherEnvironment}</div>
        </div>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );
}

