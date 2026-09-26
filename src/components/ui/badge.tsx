import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "danger" | "neutral" | "indigo";

const styles: Record<Variant, string> = {
  default: "bg-indigo-50 text-indigo-700 border-indigo-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-gray-100 text-gray-600 border-gray-200"
};

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[variant], className)}
      {...props}
    />
  );
}
