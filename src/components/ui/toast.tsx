"use client"
import { useState } from "react"
export function useToast(){
  const [msg, setMsg] = useState<string | null>(null)
  const toast = (m: string)=> { setMsg(m); setTimeout(()=> setMsg(null), 2500) }
  const ToastEl = ()=> msg ? <div role="status" aria-live="polite" className="fixed bottom-6 right-6 max-w-[calc(100vw-48px)] z-50 bg-[var(--ink)] text-white px-4 py-3 rounded-[12px] shadow-[var(--shadow-medium)] text-sm border border-[#2B2D32]">{msg}</div> : null
  return { toast, ToastEl }
}
