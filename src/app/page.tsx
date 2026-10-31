"use client"

import { Header } from "@/components/marketing/Header"
import { Footer } from "@/components/marketing/Footer"
import Link from "next/link"
import { useRef, useState } from "react"
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion"
import { ArrowRight, ArrowUpRight, Check, Code2 } from "lucide-react"

type RevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  distance?: number
}

function Reveal({ children, className, delay = 0, distance = 26 }: RevealProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: distance }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px -10% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function SlideIn({
  children,
  className,
  from = "left",
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  from?: "left" | "right"
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, x: from === "left" ? -34 : 34 }}
      whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-8% 0px -10% 0px" }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

const results = [
  { key: "BET-201", title: "Add to cart with valid SKU", status: "PASS", time: "0.8s" },
  { key: "BET-203", title: "3DS payment challenge", status: "FAIL", time: "4.2s" },
  { key: "BET-204", title: "Apple Pay via Face ID", status: "RUNNING", time: "—" },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#35434A]">
      <ScrollProgress />
      <Header />
      <main>
        <Hero />
        <TrustLine />
        <Product />
        <Traceability />
        <AIStudio />
        <Proof />
        <Pricing />
        <FAQ />
        <Closing />
      </main>
      <Footer />
    </div>
  )
}

function ScrollProgress() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.25 })
  if (reduce) return null
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-[#526E69]"
      style={{ scaleX }}
    />
  )
}

function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const markY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 110])
  const markRotate = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 5])
  const cardY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -46])
  return (
    <section ref={heroRef} className="relative overflow-hidden border-b border-[#D8E0DB]">
      <motion.div
        className="pointer-events-none absolute -right-20 top-16 hidden opacity-[0.045] lg:block"
        style={{ y: markY, rotate: markRotate }}
        aria-hidden="true"
      >
        <img src="/brand/betaray/betaray-mark-primary.svg" alt="" width={620} height={620} />
      </motion.div>
      <div className="mx-auto grid max-w-[1360px] gap-14 px-6 pb-16 pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-10 lg:pb-24 lg:pt-24">
        <motion.div
          className="relative z-10 max-w-[650px]"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D8E0DB] bg-[#E6EEEA] px-3 py-1.5 text-[12px] font-medium text-[#526E69]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#526E69]" />
            Test management, natively inside Jira
          </div>
          <h1 className="mt-7 max-w-[13ch] text-[clamp(48px,6vw,88px)] font-semibold leading-[0.9] tracking-[-0.045em] text-[#35434A]" style={{ textWrap: "balance" }}>
            Testing, where the work lives.
          </h1>
          <p className="mt-6 max-w-[50ch] text-[17px] leading-[1.65] text-[#677676]">
            Betaray brings test design, execution, AI generation and traceability into the Jira issue itself. One place for teams who need proof, not another spreadsheet.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/app" className="group inline-flex h-11 items-center gap-2 rounded-[6px] bg-[#526E69] px-5 text-[14px] font-medium text-[#F7F5F0] transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-[#435b57]">
              Open Betaray
              <ArrowUpRight size={14} className="transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden="true" />
            </Link>
            <Link href="#product" className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-[#C7D1CA] px-5 text-[14px] font-medium text-[#35434A] transition-colors duration-150 hover:bg-[#E6EEEA]">
              See how it works
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[#677676]">
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#526E69]" aria-hidden="true" /> Free 30-day trial</span>
            <span className="inline-flex items-center gap-1.5"><Check size={13} className="text-[#526E69]" aria-hidden="true" /> No credit card</span>
            <span className="inline-flex items-center gap-1.5"><Code2 size={13} className="text-[#526E69]" aria-hidden="true" /> Open source · self-hosted</span>
          </div>
        </motion.div>

        <motion.div className="relative" style={{ y: cardY }}>
          <div className="absolute -left-3 top-8 z-10 hidden rounded-[6px] border border-[#D8E0DB] bg-[#F7F5F0] px-3 py-2 text-[11px] font-medium text-[#677676] shadow-[0_8px_24px_rgba(53,67,74,0.08)] lg:block">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#526E69]" />
            Traceability on
          </div>
          <div className="overflow-hidden rounded-[8px] border border-[#D8E0DB] bg-white shadow-[0_24px_60px_-20px_rgba(53,67,74,0.24)]">
            <div className="flex items-center gap-2 border-b border-[#E6EEEA] bg-[#F7F5F0] px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#D8E0DB]" />
              <span className="h-2 w-2 rounded-full bg-[#D8E0DB]" />
              <span className="h-2 w-2 rounded-full bg-[#D8E0DB]" />
              <span className="ml-2 text-[12px] font-medium text-[#677676]">BET-301 · Regression / Sprint 24</span>
              <span className="ml-auto rounded-[3px] border border-[#D8E0DB] bg-white px-2 py-0.5 text-[10px] text-[#677676]">Staging</span>
            </div>
            <div className="grid grid-cols-[42px_1fr]">
              <div className="border-r border-[#E6EEEA] bg-[#F7F5F0] px-2 py-4">
                <img src="/brand/betaray/betaray-mark-primary.svg" alt="" width={24} height={24} className="mx-auto" />
                <div className="mx-auto mt-5 h-5 w-5 rounded-[4px] bg-[#E6EEEA]" />
                <div className="mx-auto mt-2 h-5 w-5 rounded-[4px] bg-[#E6EEEA]" />
                <div className="mx-auto mt-2 h-5 w-5 rounded-[4px] bg-[#E6EEEA]" />
              </div>
              <div>
                <div className="flex items-start justify-between gap-4 border-b border-[#E6EEEA] px-4 py-4">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A9B95]">Execution progress</div>
                    <div className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#35434A]">62%</div>
                  </div>
                  <div className="flex gap-3 text-[11px] text-[#677676]">
                    <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#526E69]" />12 passed</span>
                    <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#B56D5B]" />2 failed</span>
                  </div>
                </div>
                <div className="divide-y divide-[#E6EEEA]">
                  {results.map((row) => (
                    <div key={row.key} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFBF9]">
                      <span className="w-[52px] text-[11px] font-medium text-[#8A9B95]">{row.key}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-[#35434A]">{row.title}</span>
                      <Status status={row.status} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-[#E6EEEA] bg-[#F7F5F0] px-4 py-2.5 text-[11px] text-[#677676]">
                  <span>5 tests · 1h 12m elapsed</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#526E69]">Open execution <ArrowRight size={11} aria-hidden="true" /></span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -top-11 right-5 hidden rounded-[6px] border border-[#D8E0DB] bg-[#526E69] px-3.5 py-2.5 text-[11px] font-medium text-[#F7F5F0] shadow-[0_12px_30px_-10px_rgba(53,67,74,0.35)] lg:block">
            AI generated 3 edge cases
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Status({ status }: { status: string }) {
  const style =
    status === "PASS"
      ? "border-[#C7D9CD] bg-[#EEF5EF] text-[#3D6B4C]"
      : status === "FAIL"
        ? "border-[#E5CBC5] bg-[#FBF0EE] text-[#8F4739]"
        : "border-[#D8D6E8] bg-[#F0EFFB] text-[#5653A5]"
  return <span className={`rounded-[3px] border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.04em] ${style}`}>{status}</span>
}

function TrustLine() {
  return (
    <section className="border-b border-[#D8E0DB] bg-[#F7F5F0]">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-10 gap-y-3 px-6 py-5 text-[12px] text-[#677676] lg:px-10">
        <span className="font-medium text-[#35434A]">Built for teams that need evidence</span>
        <span className="hidden h-3 w-px bg-[#C7D1CA] sm:block" />
        <span>Financial services</span>
        <span>Healthcare</span>
        <span>Commerce</span>
        <span>Infrastructure</span>
        <span className="ml-auto hidden items-center gap-1.5 sm:inline-flex"><span className="h-1.5 w-1.5 rounded-full bg-[#526E69]" /> 42% median faster regression</span>
      </div>
    </section>
  )
}

function Product() {
  return (
    <section id="product" className="mx-auto max-w-[1360px] px-6 py-24 lg:px-10">
      <div className="grid gap-12 border-b border-[#D8E0DB] pb-16 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <div>
          <Reveal>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A9B95]">
            <span className="h-px w-5 bg-[#C7D1CA]" /> The product
          </div>
          <h2 className="mt-4 text-[clamp(32px,3.4vw,48px)] font-semibold leading-[0.98] tracking-[-0.04em] text-[#35434A]" style={{ textWrap: "balance" }}>
            One test cycle.<br />No context switch.
          </h2>
          <p className="mt-5 max-w-[38ch] text-[15px] leading-[1.65] text-[#677676]">
            Requirements, tests, executions and defects live where the team already works. The handoff disappears; the evidence stays.
          </p>
          <Link href="/app/tests" className="group mt-7 inline-flex items-center gap-2 text-[13px] font-medium text-[#526E69]">
            Explore the workspace
            <ArrowRight size={13} className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          </Reveal>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FeatureCard className="sm:row-span-2" label="Jira-native" title="The issue is the test." delay={0.05}>
            <div className="mt-6 rounded-[6px] border border-[#D8E0DB] bg-white p-3">
              <div className="flex items-center justify-between border-b border-[#E6EEEA] pb-2 text-[11px]">
                <span className="font-medium text-[#35434A]">BET-102</span>
                <span className="rounded-[3px] border border-[#E5CBC5] bg-[#FBF0EE] px-1.5 py-0.5 text-[9px] text-[#8F4739]">BUG</span>
              </div>
              <div className="pt-2 text-[12px] leading-[1.5] text-[#35434A]">Payment fails with 3DS enabled cards</div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-[#677676]"><span className="h-1.5 w-1.5 rounded-full bg-[#526E69]" /> 3 linked tests · 1 failing</div>
            </div>
          </FeatureCard>
          <FeatureCard label="BDD" title="Gherkin that runs." delay={0.12}>
            <div className="mt-5 rounded-[5px] bg-[#35434A] p-3 font-mono text-[10.5px] leading-[1.9] text-[#DDE8E1]">
              <div className="text-[#A5BDB3]">Feature: checkout</div>
              <div>Scenario: 3DS challenge</div>
              <div>Given a saved card</div>
              <div>When payment starts</div>
              <div>Then a challenge appears</div>
            </div>
          </FeatureCard>
          <FeatureCard label="Automation" title="Results, not uploads." delay={0.19}>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {["JUnit", "Cucumber", "Jenkins", "GitHub", "GitLab"].map((tool) => (
                <span key={tool} className="rounded-[3px] border border-[#D8E0DB] bg-white px-2 py-1 text-[10px] text-[#677676]">{tool}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] text-[#677676]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#526E69]" /> 24 results imported · just now
            </div>
          </FeatureCard>
          <Link href="/docs#cli" className="sm:col-span-2 group">
            <FeatureCard label="CLI & API" title="Built for AI agents.">
              <div className="mt-5 rounded-[5px] bg-[#35434A] p-3 font-mono text-[10.5px] leading-[1.8] text-[#DDE8E1]">
                <div className="text-[#A5BDB3]">$ betaray test create --summary &quot;Login flow&quot;</div>
                <div className="text-[#A5BDB3]">$ betaray execution import --file results.json</div>
                <div className="flex items-center gap-2">
                  <span>Created BET-42</span>
                  <span className="ml-auto rounded-[3px] bg-[#526E69] px-1.5 py-0.5 text-[9px] text-white">--json ready</span>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[#526E69] group-hover:gap-1.5 transition-all">Explore docs <ArrowRight size={11} aria-hidden="true" /></div>
            </FeatureCard>
          </Link>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({
  children,
  className = "",
  label,
  title,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  label: string
  title: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={`rounded-[7px] border border-[#D8E0DB] bg-[#E6EEEA] p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#AFC1B7] ${className}`}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-6% 0px -8% 0px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#8A9B95]">{label}</div>
      <div className="mt-2 text-[17px] font-medium leading-[1.3] tracking-[-0.015em] text-[#35434A]">{title}</div>
      {children}
    </motion.div>
  )
}

function Traceability() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const markY = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 70, reduce ? 0 : -80])
  const chain = [
    { label: "Requirement", value: "BET-102", sub: "Payment fails with 3DS" },
    { label: "Tests", value: "3 linked", sub: "2 manual · 1 Cucumber" },
    { label: "Execution", value: "BET-301", sub: "Staging · v1.4.0" },
    { label: "Result", value: "1 failing", sub: "BET-203 · 3DS" },
  ]
  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#35434A] px-6 py-20 text-[#F7F5F0] lg:px-10">
      <motion.img
        src="/brand/betaray/betaray-mark-reversed.svg"
        alt=""
        width={520}
        height={520}
        className="pointer-events-none absolute -right-20 top-8 hidden w-[520px] opacity-[0.055] lg:block"
        style={{ y: markY }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-[1360px]">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#A5BDB3]">
              <span className="h-px w-5 bg-[#7A9288]" /> Traceability
            </div>
            <h2 className="mt-4 max-w-[12ch] text-[clamp(34px,4vw,56px)] font-semibold leading-[0.95] tracking-[-0.045em]" style={{ textWrap: "balance" }}>
              Every result has a reason.
            </h2>
            <p className="mt-5 max-w-[34ch] text-[14px] leading-[1.65] text-[#F7F5F0]/60">
              Follow any requirement to the test that proves it, the run that exercised it, and the defect it exposed. No guessing.
            </p>
          </div>
          <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-5 lg:p-7">
            <div className="grid gap-5 sm:grid-cols-4">
              {chain.map((step, index) => (
                <motion.div
                  key={step.label}
                  className="relative"
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-6% 0px" }}
                  transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[#A5BDB3]">{step.label}</div>
                  <div className="mt-2 text-[17px] font-medium tracking-[-0.02em]">{step.value}</div>
                  <div className="mt-1 text-[11px] leading-[1.5] text-[#A5BDB3]">{step.sub}</div>
                  {index < chain.length - 1 && <span className="absolute -right-3 top-2 hidden h-px w-6 bg-white/15 sm:block" />}
                </motion.div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-[11px] text-[#A5BDB3]">
              <img src="/brand/betaray/betaray-mark-reversed.svg" alt="" width={22} height={22} />
              <span>Traceability is built in. Export the matrix as evidence.</span>
              <Link href="/app/requirements" className="ml-auto inline-flex items-center gap-1 font-medium text-[#F7F5F0]">Open matrix <ArrowUpRight size={12} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AIStudio() {
  return (
    <section id="ai" className="grid lg:grid-cols-2">
      <div className="border-b border-[#D8E0DB] bg-[#526E69] px-6 py-16 text-[#F7F5F0] lg:border-b-0 lg:border-r lg:px-10 lg:py-24">
        <SlideIn from="left" className="mx-auto max-w-[480px] lg:ml-auto lg:mr-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#DDE8E1]/65">AI Studio</div>
          <div className="mt-6 rounded-[6px] border border-white/15 bg-white/[0.07] p-4 text-[14px] leading-[1.65] text-[#F7F5F0]/90">
            “As a user I can check out with Apple Pay. The sheet opens, I confirm with Face ID, and I see an order number. If funds are insufficient I need a clear retry.”
          </div>
          <p className="mt-4 text-[12px] leading-[1.6] text-[#F7F5F0]/55">Paste a story. Betaray proposes manual steps, edge cases and Playwright.</p>
          <div className="mt-12 text-[clamp(56px,7vw,104px)] font-semibold leading-[0.9] tracking-[-0.05em]">Input.</div>
        </SlideIn>
      </div>
      <div className="bg-[#F7F5F0] px-6 py-16 lg:px-10 lg:py-24">
        <SlideIn from="right" className="mx-auto max-w-[560px]">
          <div className="rounded-[6px] border border-[#D8E0DB] bg-white">
            <div className="flex items-center justify-between border-b border-[#E6EEEA] px-4 py-3">
              <span className="text-[11px] font-medium text-[#677676]">Generated · Manual · 5 steps</span>
              <span className="rounded-[3px] bg-[#EEF5EF] px-1.5 py-0.5 text-[10px] text-[#3D6B4C]">2 edge cases</span>
            </div>
            <div className="space-y-3 p-4">
              {["Add eligible item to cart → 1 item, total correct", "Tap Apple Pay → sheet with total", "Authenticate Face ID → payment succeeds", "Order confirmation → number and email queued"].map((step, index) => (
                <div key={step} className="flex gap-3 text-[12px] leading-[1.5] text-[#35434A]">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#D8E0DB] bg-[#F7F5F0] text-[10px] text-[#677676]">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
              <div className="flex items-start gap-3 text-[12px] leading-[1.5] text-[#677676]">
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-[#B56D5B]" />
                <span>Edge: insufficient funds → retry prompt</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#E6EEEA] px-4 py-3">
              <span className="text-[11px] text-[#677676]">98% coverage</span>
              <span className="text-[11px] font-medium text-[#526E69]">Approve &amp; create test →</span>
            </div>
          </div>
          <div className="mt-12 text-[clamp(56px,7vw,104px)] font-semibold leading-[0.9] tracking-[-0.05em] text-[#526E69]">Output.</div>
        </SlideIn>
      </div>
    </section>
  )
}

function Proof() {
  return (
    <section id="customers" className="mx-auto max-w-[1360px] px-6 py-24 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <Reveal>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A9B95]">Why teams switch</div>
          <blockquote className="mt-5 max-w-[24ch] text-[clamp(28px,3vw,42px)] font-semibold leading-[1.1] tracking-[-0.035em] text-[#35434A]" style={{ textWrap: "balance" }}>
            “We stopped reconciling Jira and our test tool. The release conversation finally starts from evidence.”
          </blockquote>
          <div className="mt-6 flex items-center gap-3">
            <img src="https://i.pravatar.cc/80?img=33" alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
            <div>
              <div className="text-[13px] font-medium text-[#35434A]">Diana Ross</div>
              <div className="text-[12px] text-[#677676]">QA Lead · Enterprise platform team</div>
            </div>
          </div>
          </Reveal>
        </div>
        <div className="grid gap-px overflow-hidden rounded-[8px] border border-[#D8E0DB] bg-[#D8E0DB] sm:grid-cols-3">
          {[
            { number: "42%", label: "Faster regression cycles" },
            { number: "1.2M", label: "Tests executed per month" },
            { number: "15k", label: "Teams managing quality" },
            { number: "99.9%", label: "Platform SLA" },
            { number: "4.8/5", label: "Marketplace rating" },
            { number: "30 days", label: "Free enterprise trial" },
          ].map((stat, index) => (
            <Reveal key={stat.label} className="bg-[#F7F5F0] p-6" delay={index * 0.04} distance={14}>
              <div className="text-[clamp(24px,2.4vw,34px)] font-semibold tracking-[-0.03em] tabular-nums text-[#35434A]">{stat.number}</div>
              <div className="mt-1 text-[12px] leading-[1.5] text-[#677676]">{stat.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="border-y border-[#D8E0DB] bg-[#E6EEEA] px-6 py-24 lg:px-10">
      <div className="mx-auto grid max-w-[1360px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A9B95]">Enterprise, honestly priced</div>
          <h2 className="mt-4 text-[clamp(34px,4vw,52px)] font-semibold leading-[0.95] tracking-[-0.045em] text-[#35434A]" style={{ textWrap: "balance" }}>
            One plan.<br />No seats to count.
          </h2>
          <p className="mt-5 max-w-[34ch] text-[14px] leading-[1.65] text-[#677676]">Everything your quality team needs, including the parts most vendors charge extra for.</p>
        </div>
        <div>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[#35434A]">
            <span className="text-[clamp(104px,13vw,192px)] font-semibold leading-[0.8] tracking-[-0.06em] tabular-nums">$12</span>
            <span className="mb-1 max-w-[120px] text-[13px] leading-[1.5] text-[#677676]">per user / month, billed annually</span>
          </div>
          <div className="mt-8 grid gap-x-8 gap-y-2 text-[13px] text-[#35434A] sm:grid-cols-2">
            {["Unlimited projects & executions", "AI Studio with approvals", "Shared repository, sets & plans", "Traceability & coverage reports", "Scheduled CI imports", "Self-hosted option"].map((item) => (
              <div key={item} className="flex items-center gap-2 border-b border-[#C7D1CA]/65 py-2.5">
                <Check size={13} className="text-[#526E69]" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
          <Link href="/app" className="mt-8 inline-flex h-11 items-center gap-2 rounded-[6px] bg-[#526E69] px-5 text-[13px] font-medium text-[#F7F5F0] transition-colors hover:bg-[#435b57]">
            Start free trial <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const [active, setActive] = useState(0)
  const questions = [
    ["Does it work with Jira Cloud and Data Center?", "Both. Jira Cloud installs from the Atlassian Marketplace; Data Center uses the separate artifact. Same tests, same API."],
    ["Can we import our existing tests?", "Yes. CSV, JUnit, Cucumber JSON and direct API imports map your keys or create new tests with full traceability."],
    ["Can we self-host Betaray?", "Yes. Betaray is open source and can run on your own infrastructure. The hosted app is optional."],
    ["How do permissions work?", "Project roles cover Owner, Admin, Tester and Viewer, with access enforced per project. No extra identity-provider setup is required."],
  ]
  return (
    <section className="mx-auto max-w-[1360px] px-6 py-24 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A9B95]">Questions</div>
          <h2 className="mt-4 text-[32px] font-semibold leading-[1] tracking-[-0.035em] text-[#35434A]">Before you decide.</h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-1" role="tablist" aria-label="Frequently asked questions">
            {questions.map(([question], index) => (
              <button key={question} onClick={() => setActive(index)} role="tab" aria-selected={active === index} className={`flex w-full items-start gap-2.5 rounded-[5px] px-2 py-3 text-left text-[13px] leading-[1.5] transition-colors duration-150 ${active === index ? "bg-[#E6EEEA] text-[#35434A]" : "text-[#677676] hover:text-[#35434A]"}`}>
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${active === index ? "bg-[#526E69]" : "bg-[#C7D1CA]"}`} />
                {question}
              </button>
            ))}
          </div>
          <div className="rounded-[7px] border border-[#D8E0DB] bg-white p-6 text-[16px] leading-[1.65] text-[#35434A]" aria-live="polite">
            {questions[active][1]}
          </div>
        </div>
      </div>
    </section>
  )
}

function Closing() {
  return (
    <section className="bg-[#526E69] px-6 py-20 text-[#F7F5F0] lg:px-10">
      <div className="mx-auto grid max-w-[1360px] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <img src="/brand/betaray/betaray-mark-reversed.svg" alt="" width={72} height={72} className="mb-8" />
          <h2 className="max-w-[11ch] text-[clamp(44px,6vw,84px)] font-semibold leading-[0.9] tracking-[-0.05em]" style={{ textWrap: "balance" }}>
            Ship with proof.
          </h2>
          <p className="mt-5 max-w-[38ch] text-[15px] leading-[1.65] text-[#F7F5F0]/65">Create a workspace and bring your first Jira project with you. Free for thirty days, no card required.</p>
        </div>
        <div className="rounded-[8px] border border-white/15 bg-[#F7F5F0] p-6 text-[#35434A] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <img src="/brand/betaray/betaray-app-icon-sage.svg" alt="" width={44} height={44} className="rounded-[10px]" />
            <div>
              <div className="text-[14px] font-medium">Start your workspace</div>
              <div className="text-[11px] text-[#677676]">Connect Jira later — explore first.</div>
            </div>
          </div>
          <label htmlFor="workspace-name" className="mt-5 block text-[11px] font-medium text-[#677676]">Workspace name</label>
          <input id="workspace-name" defaultValue="Quality · BET" autoComplete="organization" className="mt-1.5 h-10 w-full rounded-[5px] border border-[#C7D1CA] bg-white px-3 text-[13px] text-[#35434A] outline-none transition-[border-color] duration-150 focus:border-[#526E69]" />
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button className="h-9 rounded-[5px] bg-[#35434A] text-[12px] font-medium text-[#F7F5F0]">Cloud</button>
            <button className="h-9 rounded-[5px] border border-[#C7D1CA] bg-white text-[12px] font-medium text-[#677676]">Data Center</button>
          </div>
          <Link href="/app" className="mt-3 grid h-10 place-items-center rounded-[5px] bg-[#526E69] text-[13px] font-medium text-[#F7F5F0] transition-colors hover:bg-[#435b57]">
            Create workspace
          </Link>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[#8A9B95]"><Code2 size={11} aria-hidden="true" /> Open source · self-hosted</div>
        </div>
      </div>
    </section>
  )
}
