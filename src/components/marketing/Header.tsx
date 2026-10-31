"use client"
import Link from "next/link"
import { useState } from "react"
import { Menu, X, ArrowUpRight } from "lucide-react"

const nav = [
  { label: "Product", href: "/#product" },
  { label: "AI Studio", href: "/#ai" },
  { label: "Customers", href: "/#customers" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Docs", href: "/docs" },
]

export function Header(){
  const [open,setOpen]=useState(false)
  return (
    <header className="sticky top-0 z-50 border-b border-[#D8E0DB]/70 bg-[#F7F5F0]/90 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1360px] items-center justify-between px-6 lg:px-10">
        <Link href="/" aria-label="Betaray home" className="flex items-center">
          <img
            src="/brand/betaray/betaray-horizontal-primary.svg"
            alt="Betaray"
            width={142}
            height={49}
            className="h-[46px] w-auto"
          />
        </Link>
        <nav className="hidden items-center gap-8 text-[14px] text-[#35434A] lg:flex">
          {nav.map((item)=> (
            <Link key={item.label} href={item.href} className="transition-colors duration-150 hover:text-[#526E69]">
              {item.label}
            </Link>
          ))}
          <Link href="/app" className="group inline-flex h-9 items-center gap-2 rounded-[6px] bg-[#526E69] px-4 text-[13px] font-medium text-[#F7F5F0] transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-[#435b57]">
            Open Betaray
            <ArrowUpRight size={13} className="transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden="true" />
          </Link>
        </nav>
        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/app" className="inline-flex h-9 items-center rounded-[6px] bg-[#526E69] px-3 text-[13px] font-medium text-[#F7F5F0]">
            Open
          </Link>
          <button
            onClick={()=>setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-9 w-9 place-items-center rounded-[6px] border border-[#D8E0DB] bg-[#F7F5F0]"
          >
            {open ? <X size={17} aria-hidden="true"/> : <Menu size={17} aria-hidden="true"/>}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-[#D8E0DB] bg-[#F7F5F0] px-6 py-6 lg:hidden">
          <div className="space-y-1">
            {nav.map((item)=> (
              <Link key={item.label} href={item.href} onClick={()=>setOpen(false)} className="block rounded-[6px] px-2 py-3 text-[17px] font-medium text-[#35434A] hover:bg-[#E6EEEA]">
                {item.label}
              </Link>
            ))}
            <Link href="/app" onClick={()=>setOpen(false)} className="mt-3 flex h-11 items-center justify-center rounded-[6px] bg-[#526E69] text-[15px] font-medium text-[#F7F5F0]">
              Open Betaray
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
