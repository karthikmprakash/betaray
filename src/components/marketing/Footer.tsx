import Link from "next/link"

const groups = [
  { title: "Product", links: ["Test Management", "Enterprise", "Exploratory", "AI Studio"] },
  { title: "Resources", links: ["Documentation", "Academy", "Support", "API"] },
  { title: "Company", links: ["About", "Contact", "Community", "Legal"] },
]

export function Footer(){
  return (
    <footer className="bg-[#35434A] text-[#F7F5F0]">
      <div className="mx-auto max-w-[1360px] px-6 py-16 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-w-[520px]">
            <Link href="/" aria-label="Betaray home">
              <img
                src="/brand/betaray/betaray-horizontal-reversed.svg"
                alt="Betaray"
                width={154}
                height={53}
                className="h-[46px] w-auto"
              />
            </Link>
            <p className="mt-5 max-w-[42ch] text-[15px] leading-[1.65] text-[#F7F5F0]/60">
              Native test management inside Jira. Every requirement traceable from story to defect. Built for teams that ship.
            </p>
            <div className="mt-7 flex flex-wrap gap-2 text-[12px] text-[#F7F5F0]/70">
              <span className="rounded-[4px] border border-white/15 px-2.5 py-1">Open source</span>
              <span className="rounded-[4px] border border-white/15 px-2.5 py-1">Self-hosted</span>
              <span className="rounded-[4px] border border-white/15 px-2.5 py-1">Jira Cloud &amp; DC</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {groups.map((group)=> (
              <div key={group.title}>
                <div className="text-[13px] font-medium text-[#F7F5F0]">{group.title}</div>
                <div className="mt-4 space-y-2.5 text-[13px] text-[#F7F5F0]/55">
                  {group.links.map((link)=> <div key={link}>{link}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-[12px] text-[#F7F5F0]/40 sm:flex-row">
          <span>© 2026 Betaray by Sembi. All rights reserved.</span>
          <span>Made for Jira Cloud & Data Center · Open source</span>
        </div>
      </div>
    </footer>
  )
}
