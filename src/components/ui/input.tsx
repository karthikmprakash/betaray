import * as React from "react"
import { cn } from "@/lib/utils"

const control = "w-full rounded-[6px] border border-[var(--border-strong)] bg-[var(--surface)] text-[15px] text-[var(--ink)] placeholder:text-[var(--muted-2)] disabled:opacity-50 disabled:cursor-not-allowed"
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({className,type,...props},ref) => (
  <input type={type} className={cn(control, "flex h-9 px-3 py-1", className)} ref={ref} {...props}/>
))
Input.displayName = "Input"
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({className,...props},ref) => (
  <textarea className={cn(control, "flex min-h-[100px] px-3 py-2 resize-y", className)} ref={ref} {...props}/>
))
Textarea.displayName = "Textarea"
export const Select = ({className, ...props}: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(control, "h-9 px-3", className)} {...props}/>
