"use client";

import * as React from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "./utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastProps {
  id: string;
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ id, title, description, variant = "info", onClose, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true);

    React.useEffect(() => {
      if (onClose) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => onClose(), 300); // Wait for animation
        }, 5000);

        return () => clearTimeout(timer);
      }
    }, [onClose]);

    const handleClose = () => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    };

    const variantStyles = {
      success: "bg-green-50 border-green-200 text-green-800",
      error: "bg-red-50 border-red-200 text-red-800",
      info: "bg-blue-50 border-blue-200 text-blue-800",
      warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    };

    const icons = {
      success: CheckCircle2,
      error: AlertCircle,
      info: Info,
      warning: AlertTriangle,
    };

    const Icon = icons[variant];

    if (!isVisible) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all duration-300",
          variantStyles[variant],
          isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-full"
        )}
        {...props}
      >
        <Icon className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-semibold text-sm mb-1">{title}</div>
          )}
          <div className="text-sm">{description}</div>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            className="shrink-0 rounded-md p-1 text-current opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = "Toast";

export { Toast };

