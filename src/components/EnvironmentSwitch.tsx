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
    <button
      type="button"
      role="switch"
      aria-checked={isProduction}
      disabled={disabled}
      onClick={handleClick}
      title={`Current: ${displayText}. Click to switch to ${otherEnvironment}.`}
      className={cn(
        "text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {displayText}
    </button>
  );
}

