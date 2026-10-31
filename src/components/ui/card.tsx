import * as React from "react"
import { cn } from "@/lib/utils"
export function Card({className, ...p}: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("bg-[var(--surface)] border border-[var(--border)] rounded-[12px]",className)} {...p} /> }
export function CardHeader({className,...p}: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("p-5",className)} {...p} /> }
export function CardTitle({className,...p}: React.HTMLAttributes<HTMLHeadingElement>){ return <h3 className={cn("font-medium leading-none tracking-[-0.02em] text-[15px] text-[var(--ink)]",className)} {...p} /> }
export function CardDescription({className,...p}: React.HTMLAttributes<HTMLParagraphElement>){ return <p className={cn("text-[15px] text-[var(--muted)] leading-relaxed",className)} {...p} /> }
export function CardContent({className,...p}: React.HTMLAttributes<HTMLDivElement>){ return <div className={cn("p-5 pt-0",className)} {...p} /> }
