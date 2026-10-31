import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", size = "default", type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(
    "inline-flex items-center justify-center gap-1.5 rounded-[6px] text-[15px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
    variant === "default" && "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]",
    variant === "outline" && "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)]",
    variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
    variant === "secondary" && "bg-[var(--surface-2)] text-[var(--ink)] hover:bg-[var(--surface-3)]",
    size === "default" && "h-9 px-4",
    size === "sm" && "h-8 px-3 text-xs",
    size === "lg" && "h-11 px-6",
    size === "icon" && "h-9 w-9",
    className,
  )} {...props}/>
))
Button.displayName = "Button"
