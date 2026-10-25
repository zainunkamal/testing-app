import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "danger" | "warning" | "neutral" | "postgres" | "redis";
  pulse?: boolean;
}

export function Badge({
  className,
  variant = "neutral",
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    neutral: "bg-slate-800 text-slate-300 border-slate-700",
    postgres: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    redis: "bg-rose-600/10 text-rose-400 border-rose-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border backdrop-blur-sm transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              variant === "success" && "bg-emerald-400",
              variant === "danger" && "bg-rose-400",
              variant === "warning" && "bg-amber-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              variant === "success" && "bg-emerald-500",
              variant === "danger" && "bg-rose-500",
              variant === "warning" && "bg-amber-500"
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}
