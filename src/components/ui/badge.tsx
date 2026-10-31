import * as React from "react"
import { cn } from "@/lib/utils"
export function Badge({className,...p}: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("inline-flex items-center px-2.5 py-1 text-[13px] font-medium rounded-[4px] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]",className)} {...p} /> }
