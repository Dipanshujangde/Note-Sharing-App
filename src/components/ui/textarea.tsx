import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[140px] w-full rounded-lg border border-input bg-white px-3 py-2 text-sm ring-offset-background",
        "placeholder:text-muted-foreground/70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-shadow",
        className
      )}
      {...props}
    />
  );
}
