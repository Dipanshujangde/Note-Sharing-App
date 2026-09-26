import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "destructive" | "ghost";
  size?: "default" | "sm";
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: Props) {
  const styles = {
    default:
      "bg-gradient-brand text-white shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/30 hover:brightness-110 active:scale-[0.98]",
    outline:
      "border border-input bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 active:scale-[0.98]",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-red-600 active:scale-[0.98]",
    ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
  }[variant];
  const sizing = size === "sm" ? "h-9 px-3 text-xs" : "h-10 px-5";
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50",
        sizing,
        styles,
        className,
      )}
      {...props}
    />
  );
}
