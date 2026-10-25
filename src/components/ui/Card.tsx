import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: "blue" | "emerald" | "rose" | "none";
}

export function Card({
  className,
  glow = "none",
  children,
  ...props
}: CardProps) {
  const glowStyles = {
    blue: "hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5",
    emerald: "hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5",
    rose: "hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-500/5",
    none: "",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-xl p-6 transition-all duration-200",
        glowStyles[glow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center justify-between pb-4 border-b border-slate-800/60 mb-5", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold text-slate-100 flex items-center gap-2", className)} {...props}>
      {children}
    </h3>
  );
}
