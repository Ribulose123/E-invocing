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
  const isSandbox = environment === 'sandbox';

  const handleClick = () => {
    if (!disabled) {
      onEnvironmentChange(isSandbox ? 'production' : 'sandbox');
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isSandbox}
      disabled={disabled}
      onClick={handleClick}
      title={isSandbox ? 'Current: Sandbox. Click to switch to Production.' : 'Current: Production. Click to switch to Sandbox.'}
      className={cn(
        "flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {/* Show only the current mode: SANDBOX or PRODUCTION */}
      <span className={cn("text-[10px] sm:text-xs font-medium uppercase tracking-wide text-emerald-600", isSandbox ? "text-slate-300" : "text-primary")}>
        {isSandbox ? 'SANDBOX' : 'PRODUCTION'}
      </span>

      
      <div
        className={cn(
          "relative h-6 w-11 sm:h-7 sm:w-12 rounded-full transition-colors duration-200 shadow-md border border-white/30",
          isSandbox ? "bg-slate-300" : "bg-[#2D0A5E]"
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white shadow transition-all duration-200",
            isSandbox ? "left-0.5 sm:left-1" : "left-[calc(100%-18px)] sm:left-[calc(100%-22px)]"
          )}
        />
      </div>
    </button>
  );
}
