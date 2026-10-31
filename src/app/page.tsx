"use client"

import { Header } from "@/components/marketing/Header"
import { Footer } from "@/components/marketing/Footer"
import { MantaRay } from "@/components/marketing/MantaRay"
import Link from "next/link"
import { useRef, useState } from "react"
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  ClipboardCheck,
  Code2,
  Database,
  GitBranch,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react"

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
  { key: "BET-201", title: "Add to cart with valid SKU", status: "PASS" },
  { key: "BET-203", title: "3DS payment challenge", status: "FAIL" },
  { key: "BET-204", title: "Apple Pay via Face ID", status: "RUNNING" },
]

const capabilities = [
  {
    icon: ClipboardCheck,
    label: "Manage with clarity",
    body: "Organize manual test cases, suites, and execution cycles in one place — with revisions, folders, and traceability built in.",
  },
  {
    icon: Search,
    label: "Explore beyond the obvious",
    body: "Validate complex workflows through exploratory sessions, workflow checks, and CI-driven validation that look past the happy path.",
  },
  {
    icon: GitBranch,
    label: "Connect your ecosystem",
    body: "Bring testing closer to development with Jira Cloud sync, project-scoped API tokens, and a CLI that fits your CI pipeline.",
  },
  {
    icon: BarChart3,
    label: "Understand what matters",
    body: "Turn execution data into release signals. See coverage, failures, and defects without drowning in noise.",
  },
]

const principles = [
  {
    icon: ShieldCheck,
    title: "Open source, MIT licensed",
    body: "Read the code, extend the workflow, and run it on your own terms. No black box.",
  },
  {
    icon: Database,
    title: "Your data stays yours",
    body: "SQLite by default, with a documented Postgres path for production. No vendor lock-in.",
  },
  {
    icon: Terminal,
    title: "Agents welcome",
    body: "A JSON-ready CLI, project-scoped tokens, and documented APIs for automation.",
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#35434A]">
      <ScrollProgress />
      <Header />
      <main>
        <Hero />
        <TrustLine />
        <Philosophy />
        <Capabilities />
        <Traceability />
        <AIStudio />
        <OpenSource />
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
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.25,
  })
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
  const markY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 100])
  const cardY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40])

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden border-b border-[#D8E0DB]"
    >
      <MantaRay
        variant="fill"
        className="pointer-events-none absolute -right-40 top-10 hidden w-[860px] text-[#526E69] opacity-[0.045] lg:block"
      />
      <motion.div
        className="pointer-events-none absolute -left-32 bottom-0 hidden w-[420px] text-[#526E69] opacity-[0.03] lg:block"
        style={{ y: markY }}
        aria-hidden="true"
      >
        <MantaRay variant="line" className="w-full" />
      </motion.div>

      <div className="relative mx-auto grid max-w-[1360px] gap-14 px-6 pb-16 pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-10 lg:pb-24 lg:pt-24">
        <motion.div
          className="relative z-10 max-w-[650px]"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D8E0DB] bg-[#E6EEEA] px-3 py-1.5 text-[12px] font-medium text-[#526E69]">
            <MantaRay variant="line" className="h-3.5 w-3.5" />
            Inspired by the manta ray
          </div>
          <h1
            className="mt-7 max-w-[12ch] text-[clamp(48px,6vw,88px)] font-semibold leading-[0.9] tracking-[-0.045em] text-[#35434A]"
            style={{ textWrap: "balance" }}
          >
            See beyond the surface.
          </h1>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.65] text-[#677676]">
            Test management that brings clarity to complexity. Plan, organize,
            and execute software tests with confidence — with Jira integration
            that keeps your team connected.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="group inline-flex h-11 items-center gap-2 rounded-[6px] bg-[#526E69] px-5 text-[14px] font-medium text-[#F7F5F0] transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-[#435b57]"
            >
              Explore Betaray
              <ArrowUpRight
                size={14}
                className="transition-transform duration-150 group-hover:-translate-y-px group-hover:translate-x-px"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="#product"
              className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-[#C7D1CA] px-5 text-[14px] font-medium text-[#35434A] transition-colors duration-150 hover:bg-[#E6EEEA]"
            >
              See how it works
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-[#677676]">
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} className="text-[#526E69]" aria-hidden="true" />
              Open source · self-hosted
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={13} className="text-[#526E69]" aria-hidden="true" />
              Jira Cloud sync
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Code2 size={13} className="text-[#526E69]" aria-hidden="true" />
              CLI + API for agents
            </span>
          </div>
        </motion.div>

        <motion.div className="relative" style={{ y: cardY }}>
          <div className="absolute -top-11 left-4 z-10 hidden rounded-[6px] border border-[#D8E0DB] bg-[#F7F5F0] px-3 py-2 text-[11px] font-medium text-[#677676] shadow-[0_8px_24px_rgba(53,67,74,0.08)] lg:block">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#526E69]" />
            Traceability on
          </div>
          <div className="overflow-hidden rounded-[8px] border border-[#D8E0DB] bg-white shadow-[0_24px_60px_-20px_rgba(53,67,74,0.24)]">
            <div className="flex items-center gap-2 border-b border-[#E6EEEA] bg-[#F7F5F0] px-4 py-3">
              <span className="h-2 w-2 rounded-full bg-[#D8E0DB]" />
              <span className="h-2 w-2 rounded-full bg-[#D8E0DB]" />
              <span className="h-2 w-2 rounded-full bg-[#D8E0DB]" />
              <span className="ml-2 text-[12px] font-medium text-[#677676]">
                BET-301 · Regression / Sprint 24
              </span>
              <span className="ml-auto rounded-[3px] border border-[#D8E0DB] bg-white px-2 py-0.5 text-[10px] text-[#677676]">
                Staging
              </span>
            </div>
            <div className="grid grid-cols-[42px_1fr]">
              <div className="border-r border-[#E6EEEA] bg-[#F7F5F0] px-2 py-4">
                <MantaRay
                  variant="line"
                  className="mx-auto h-6 w-6 text-[#526E69]"
                />
                <div className="mx-auto mt-5 h-5 w-5 rounded-[4px] bg-[#E6EEEA]" />
                <div className="mx-auto mt-2 h-5 w-5 rounded-[4px] bg-[#E6EEEA]" />
                <div className="mx-auto mt-2 h-5 w-5 rounded-[4px] bg-[#E6EEEA]" />
              </div>
              <div>
                <div className="flex items-start justify-between gap-4 border-b border-[#E6EEEA] px-4 py-4">
                  <div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A9B95]">
                      Execution progress
                    </div>
                    <div className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.03em] text-[#35434A]">
                      62%
                    </div>
                  </div>
                  <div className="flex gap-3 text-[11px] text-[#677676]">
                    <span>
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#526E69]" />
                      12 passed
                    </span>
                    <span>
                      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#B56D5B]" />
                      2 failed
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-[#E6EEEA]">
                  {results.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#FAFBF9]"
                    >
                      <span className="w-[52px] text-[11px] font-medium text-[#8A9B95]">
                        {row.key}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-[#35434A]">
                        {row.title}
                      </span>
                      <Status status={row.status} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-[#E6EEEA] bg-[#F7F5F0] px-4 py-2.5 text-[11px] text-[#677676]">
                  <span>5 tests · 1h 12m elapsed</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[#526E69]">
                    Open execution <ArrowRight size={11} aria-hidden="true" />
                  </span>
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
  return (
    <span
      className={`rounded-[3px] border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.04em] ${style}`}
    >
      {status}
    </span>
  )
}

function TrustLine() {
  return (
    <section className="border-b border-[#D8E0DB] bg-[#F7F5F0]">
      <div className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-x-10 gap-y-3 px-6 py-5 text-[12px] text-[#677676] lg:px-10">
        <span className="font-medium text-[#35434A]">
          Inspired by the ocean. Engineered for quality.
        </span>
        <span className="hidden h-3 w-px bg-[#C7D1CA] sm:block" />
        <span>Manual testing</span>
        <span>Integration validation</span>
        <span>Jira-connected workflows</span>
        <span>Release confidence</span>
        <span className="ml-auto hidden items-center gap-1.5 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#526E69]" />
          See beyond the surface
        </span>
      </div>
    </section>
  )
}

function Philosophy() {
  return (
    <section
      id="philosophy"
      className="relative overflow-hidden border-b border-[#D8E0DB] bg-[#F7F5F0]"
    >
      <MantaRay
        variant="line"
        className="pointer-events-none absolute -right-40 top-1/2 hidden w-[760px] -translate-y-1/2 text-[#526E69] opacity-[0.06] lg:block"
      />
      <div className="relative mx-auto grid max-w-[1360px] gap-14 px-6 py-24 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-10">
        <Reveal>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A9B95]">
            <span className="h-px w-5 bg-[#C7D1CA]" /> The philosophy
          </div>
          <h2
            className="mt-4 max-w-[15ch] text-[clamp(34px,4vw,56px)] font-semibold leading-[0.95] tracking-[-0.045em] text-[#35434A]"
            style={{ textWrap: "balance" }}
          >
            Inspired by the ocean. Engineered for quality.
          </h2>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.7] text-[#677676]">
            The manta ray moves effortlessly through an ocean of complexity. We
            believe software testing should feel just as intuitive.
          </p>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-[1.7] text-[#677676]">
            Betaray helps QA teams navigate complex applications, maintain
            visibility across test activities, and focus on what matters most.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {[
              "Broad wings. Broader coverage.",
              "Beneath the surface.",
              "Less noise. More insight.",
            ].map((line) => (
              <span
                key={line}
                className="rounded-[4px] border border-[#D8E0DB] bg-white px-2.5 py-1.5 text-[11px] text-[#677676]"
              >
                {line}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.08} distance={18}>
          <div className="relative overflow-hidden rounded-[8px] border border-[#D8E0DB] bg-[#E6EEEA] p-6 sm:p-8">
            <div className="absolute right-5 top-5 text-[10px] font-medium uppercase tracking-[0.1em] text-[#8A9B95]">
              Ray / B
            </div>
            <MantaRay
              variant="line"
              className="mx-auto mt-6 w-full max-w-[420px] text-[#526E69]"
            />
            <div className="mt-6 grid gap-3 border-t border-[#C7D1CA]/70 pt-5 sm:grid-cols-3">
              {[
                ["01", "Observe", "See the whole application."],
                ["02", "Filter", "Find the signal in results."],
                ["03", "Move", "Release with confidence."],
              ].map(([step, title, body]) => (
                <div key={step}>
                  <div className="text-[10px] font-medium tracking-[0.08em] text-[#8A9B95]">
                    {step}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[#35434A]">
                    {title}
                  </div>
                  <div className="mt-1 text-[11px] leading-[1.5] text-[#677676]">
                    {body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Capabilities() {
  return (
    <section
      id="product"
      className="mx-auto max-w-[1360px] px-6 py-24 lg:px-10"
    >
      <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
        <Reveal>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A9B95]">
            <span className="h-px w-5 bg-[#C7D1CA]" /> Capabilities
          </div>
          <h2
            className="mt-4 max-w-[12ch] text-[clamp(32px,3.4vw,48px)] font-semibold leading-[0.98] tracking-[-0.04em] text-[#35434A]"
            style={{ textWrap: "balance" }}
          >
            Every layer of quality. Connected.
          </h2>
        </Reveal>
        <Reveal delay={0.06}>
          <p className="max-w-[52ch] text-[15px] leading-[1.65] text-[#677676] lg:ml-auto">
            Four capabilities that keep the whole quality story in view — from
            the first manual case to the release decision.
          </p>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {capabilities.map((item, index) => {
          const Icon = item.icon
          return (
            <Reveal key={item.label} delay={0.04 * index} distance={18}>
              <div className="group relative h-full overflow-hidden rounded-[7px] border border-[#D8E0DB] bg-[#E6EEEA] p-6 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[#AFC1B7]">
                <MantaRay
                  variant="fill"
                  className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 text-[#526E69] opacity-[0.06] transition-opacity duration-200 group-hover:opacity-[0.1]"
                />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-[5px] border border-[#C7D1CA] bg-[#F7F5F0] text-[#526E69]">
                  <Icon size={17} aria-hidden="true" />
                </div>
                <h3 className="relative mt-5 text-[18px] font-medium leading-[1.25] tracking-[-0.02em] text-[#35434A]">
                  {item.label}
                </h3>
                <p className="relative mt-2 max-w-[40ch] text-[13px] leading-[1.65] text-[#677676]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

function Traceability() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduce = useReducedMotion() ?? false
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })
  const markY = useTransform(
    scrollYProgress,
    [0, 1],
    [reduce ? 0 : 70, reduce ? 0 : -80],
  )
  const chain = [
    { label: "Requirement", value: "BET-102", sub: "Payment fails with 3DS" },
    { label: "Tests", value: "3 linked", sub: "2 manual · 1 Cucumber" },
    { label: "Execution", value: "BET-301", sub: "Staging · v1.4.0" },
    { label: "Result", value: "1 failing", sub: "BET-203 · 3DS" },
  ]
  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#35434A] px-6 py-20 text-[#F7F5F0] lg:px-10"
    >
      <motion.div
        className="pointer-events-none absolute -right-28 top-4 hidden w-[540px] text-[#F7F5F0] opacity-[0.06] lg:block"
        style={{ y: markY }}
        aria-hidden="true"
      >
        <MantaRay variant="line" className="w-full" />
      </motion.div>
      <div className="relative mx-auto max-w-[1360px]">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#A5BDB3]">
              <span className="h-px w-5 bg-[#7A9288]" /> Traceability
            </div>
            <h2
              className="mt-4 max-w-[12ch] text-[clamp(34px,4vw,56px)] font-semibold leading-[0.95] tracking-[-0.045em]"
              style={{ textWrap: "balance" }}
            >
              Every result has a reason.
            </h2>
            <p className="mt-5 max-w-[36ch] text-[14px] leading-[1.65] text-[#F7F5F0]/60">
              Follow any requirement to the test that proves it, the run that
              exercised it, and the defect it exposed. See the whole story, not
              just the surface.
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
                  transition={{
                    duration: 0.5,
                    delay: index * 0.08,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[#A5BDB3]">
                    {step.label}
                  </div>
                  <div className="mt-2 text-[17px] font-medium tracking-[-0.02em]">
                    {step.value}
                  </div>
                  <div className="mt-1 text-[11px] leading-[1.5] text-[#A5BDB3]">
                    {step.sub}
                  </div>
                  {index < chain.length - 1 && (
                    <span className="absolute -right-3 top-2 hidden h-px w-6 bg-white/15 sm:block" />
                  )}
                </motion.div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 text-[11px] text-[#A5BDB3]">
              <MantaRay
                variant="line"
                className="h-5 w-5 text-[#F7F5F0]/70"
              />
              <span>Traceability is built in. Export the matrix as evidence.</span>
              <Link
                href="/app/requirements"
                className="ml-auto inline-flex items-center gap-1 font-medium text-[#F7F5F0]"
              >
                Open matrix <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
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
      <div className="relative overflow-hidden border-b border-[#D8E0DB] bg-[#526E69] px-6 py-16 text-[#F7F5F0] lg:border-b-0 lg:border-r lg:px-10 lg:py-24">
        <MantaRay
          variant="line"
          className="pointer-events-none absolute -right-24 top-10 w-[420px] text-[#F7F5F0] opacity-[0.08]"
        />
        <SlideIn from="left" className="relative mx-auto max-w-[480px] lg:ml-auto lg:mr-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#DDE8E1]/65">
            AI Studio
          </div>
          <div className="mt-6 rounded-[6px] border border-white/15 bg-white/[0.07] p-4 text-[14px] leading-[1.65] text-[#F7F5F0]/90">
            “As a user I can check out with Apple Pay. The sheet opens, I confirm
            with Face ID, and I see an order number. If funds are insufficient I
            need a clear retry.”
          </div>
          <p className="mt-4 text-[12px] leading-[1.6] text-[#F7F5F0]/55">
            Paste a story. Betaray proposes manual steps, edge cases and
            Gherkin — ready for human review.
          </p>
          <div className="mt-12 text-[clamp(56px,7vw,104px)] font-semibold leading-[0.9] tracking-[-0.05em]">
            Input.
          </div>
        </SlideIn>
      </div>
      <div className="relative overflow-hidden bg-[#F7F5F0] px-6 py-16 lg:px-10 lg:py-24">
        <MantaRay
          variant="fill"
          className="pointer-events-none absolute -left-20 bottom-0 w-[320px] text-[#526E69] opacity-[0.04]"
        />
        <SlideIn from="right" className="relative mx-auto max-w-[560px]">
          <div className="rounded-[6px] border border-[#D8E0DB] bg-white">
            <div className="flex items-center justify-between border-b border-[#E6EEEA] px-4 py-3">
              <span className="text-[11px] font-medium text-[#677676]">
                Generated · Manual · 5 steps
              </span>
              <span className="rounded-[3px] bg-[#EEF5EF] px-1.5 py-0.5 text-[10px] text-[#3D6B4C]">
                2 edge cases
              </span>
            </div>
            <div className="space-y-3 p-4">
              {[
                "Add eligible item to cart → 1 item, total correct",
                "Tap Apple Pay → sheet with total",
                "Authenticate Face ID → payment succeeds",
                "Order confirmation → number and email queued",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex gap-3 text-[12px] leading-[1.5] text-[#35434A]"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#D8E0DB] bg-[#F7F5F0] text-[10px] text-[#677676]">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
              <div className="flex items-start gap-3 text-[12px] leading-[1.5] text-[#677676]">
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-[#B56D5B]" />
                <span>Edge: insufficient funds → retry prompt</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#E6EEEA] px-4 py-3">
              <span className="text-[11px] text-[#677676]">Human review</span>
              <span className="text-[11px] font-medium text-[#526E69]">
                Approve &amp; create test →
              </span>
            </div>
          </div>
          <div className="mt-12 text-[clamp(56px,7vw,104px)] font-semibold leading-[0.9] tracking-[-0.05em] text-[#526E69]">
            Output.
          </div>
        </SlideIn>
      </div>
    </section>
  )
}

function OpenSource() {
  return (
    <section
      id="open-source"
      className="relative overflow-hidden border-y border-[#D8E0DB] bg-[#E6EEEA] px-6 py-24 lg:px-10"
    >
      <MantaRay
        variant="fill"
        className="pointer-events-none absolute -right-28 -top-16 hidden w-[520px] text-[#526E69] opacity-[0.05] lg:block"
      />
      <div className="relative mx-auto grid max-w-[1360px] gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A9B95]">
            <span className="h-px w-5 bg-[#C7D1CA]" /> Open source
          </div>
          <h2
            className="mt-4 max-w-[12ch] text-[clamp(34px,4vw,52px)] font-semibold leading-[0.95] tracking-[-0.045em] text-[#35434A]"
            style={{ textWrap: "balance" }}
          >
            Run it your way.
          </h2>
          <p className="mt-5 max-w-[38ch] text-[14px] leading-[1.7] text-[#677676]">
            Betaray is MIT-licensed and built for self-hosting. Inspect the
            code, connect Jira when you are ready, and keep your quality data
            where it belongs.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-[11px] text-[#677676]">
            <span className="rounded-[4px] border border-[#C7D1CA] bg-[#F7F5F0] px-2.5 py-1">
              MIT
            </span>
            <span className="rounded-[4px] border border-[#C7D1CA] bg-[#F7F5F0] px-2.5 py-1">
              Docker · GHCR
            </span>
            <span className="rounded-[4px] border border-[#C7D1CA] bg-[#F7F5F0] px-2.5 py-1">
              SQLite / Postgres
            </span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://github.com/karthikmprakash/betaray"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-[#526E69] px-5 text-[13px] font-medium text-[#F7F5F0] transition-colors hover:bg-[#435b57]"
            >
              View on GitHub <ArrowUpRight size={13} aria-hidden="true" />
            </a>
            <Link
              href="/docs"
              className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-[#C7D1CA] bg-[#F7F5F0] px-5 text-[13px] font-medium text-[#35434A] transition-colors hover:bg-white"
            >
              Read the docs
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {principles.map((item, index) => {
            const Icon = item.icon
            return (
              <Reveal key={item.title} delay={index * 0.05} distance={14}>
                <div className="h-full rounded-[7px] border border-[#C7D1CA] bg-[#F7F5F0] p-5">
                  <Icon size={18} className="text-[#526E69]" aria-hidden="true" />
                  <h3 className="mt-4 text-[14px] font-medium text-[#35434A]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[12px] leading-[1.6] text-[#677676]">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            )
          })}
          <div className="rounded-[7px] border border-[#35434A] bg-[#35434A] p-5 text-[#F7F5F0] sm:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.1em] text-[#A5BDB3]">
                  Start the container
                </div>
                <code className="mt-2 block break-all font-mono text-[12px] leading-[1.6] text-[#DDE8E1]">
                  docker run --env-file .env -p 3000:3000{" "}
                  ghcr.io/karthikmprakash/betaray:latest
                </code>
              </div>
              <a
                href="https://github.com/karthikmprakash/betaray/pkgs/container/betaray"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#DDE8E1] hover:text-white"
              >
                GHCR <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const [active, setActive] = useState(0)
  const questions = [
    [
      "Does Betaray require Jira?",
      "No. Jira Cloud is optional. All test management features work standalone; you can connect Jira later from Integrations & API.",
    ],
    [
      "Which Jira versions are supported?",
      "Jira Cloud via OAuth 2.0 (3LO), with project mapping, issue sync into Requirements, and optional webhooks. Jira Data Center is not supported yet.",
    ],
    [
      "Can we self-host Betaray?",
      "Yes. Betaray is MIT-licensed. Run it with npm or pull the GHCR image, then apply the Prisma migrations. SQLite works locally; a Postgres migration path is documented for production.",
    ],
    [
      "Can AI agents use Betaray?",
      "Yes. Create a project-scoped API token and use the Betaray CLI or the HTTP API. Every CLI command supports --json, stdin piping, and deterministic exit codes.",
    ],
    [
      "How does AI test generation work?",
      "Template mode works locally. Live generation requires both OPENAI_API_KEY and OPENAI_MODEL. Drafts are saved for human review and must be approved before becoming tests.",
    ],
  ]
  return (
    <section className="mx-auto max-w-[1360px] px-6 py-24 lg:px-10">
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#8A9B95]">
            <span className="h-px w-5 bg-[#C7D1CA]" /> Questions
          </div>
          <h2 className="mt-4 text-[32px] font-semibold leading-[1] tracking-[-0.035em] text-[#35434A]">
            Before you dive in.
          </h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div
            className="space-y-1"
            role="tablist"
            aria-label="Frequently asked questions"
          >
            {questions.map(([question], index) => (
              <button
                key={question}
                onClick={() => setActive(index)}
                role="tab"
                aria-selected={active === index}
                className={`flex w-full items-start gap-2.5 rounded-[5px] px-2 py-3 text-left text-[13px] leading-[1.5] transition-colors duration-150 ${
                  active === index
                    ? "bg-[#E6EEEA] text-[#35434A]"
                    : "text-[#677676] hover:text-[#35434A]"
                }`}
              >
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    active === index ? "bg-[#526E69]" : "bg-[#C7D1CA]"
                  }`}
                />
                {question}
              </button>
            ))}
          </div>
          <div
            className="rounded-[7px] border border-[#D8E0DB] bg-white p-6 text-[16px] leading-[1.65] text-[#35434A]"
            aria-live="polite"
          >
            {questions[active][1]}
          </div>
        </div>
      </div>
    </section>
  )
}

function Closing() {
  return (
    <section className="relative overflow-hidden bg-[#526E69] px-6 py-20 text-[#F7F5F0] lg:px-10">
      <MantaRay
        variant="line"
        className="pointer-events-none absolute -right-32 -top-20 hidden w-[720px] text-[#F7F5F0] opacity-[0.08] lg:block"
      />
      <MantaRay
        variant="fill"
        className="pointer-events-none absolute -left-32 bottom-[-120px] hidden w-[420px] text-[#35434A] opacity-[0.06] lg:block"
      />
      <div className="relative mx-auto grid max-w-[1360px] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-[#DDE8E1]">
            <Sparkles size={12} aria-hidden="true" />
            See beyond the surface
          </div>
          <h2
            className="mt-5 max-w-[11ch] text-[clamp(44px,6vw,84px)] font-semibold leading-[0.9] tracking-[-0.05em]"
            style={{ textWrap: "balance" }}
          >
            Release with confidence.
          </h2>
          <p className="mt-5 max-w-[42ch] text-[15px] leading-[1.65] text-[#F7F5F0]/65">
            Bring your first project, connect Jira when you are ready, and turn
            test evidence into a release decision you can defend.
          </p>
        </div>
        <div className="rounded-[8px] border border-white/15 bg-[#F7F5F0] p-6 text-[#35434A] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <img
              src="/brand/betaray/betaray-app-icon-sage.svg"
              alt=""
              width={44}
              height={44}
              className="rounded-[10px]"
            />
            <div>
              <div className="text-[14px] font-medium">Open your workspace</div>
              <div className="text-[11px] text-[#677676]">
                Self-hosted. No credit card. No trial timer.
              </div>
            </div>
          </div>
          <Link
            href="/app"
            className="mt-6 grid h-10 place-items-center rounded-[5px] bg-[#526E69] text-[13px] font-medium text-[#F7F5F0] transition-colors hover:bg-[#435b57]"
          >
            Explore Betaray
          </Link>
          <Link
            href="/docs"
            className="mt-2.5 grid h-10 place-items-center rounded-[5px] border border-[#C7D1CA] bg-white text-[13px] font-medium text-[#35434A] transition-colors hover:bg-[#F7F5F0]"
          >
            Read the installation guide
          </Link>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-[#8A9B95]">
            <Code2 size={11} aria-hidden="true" /> MIT licensed · Jira Cloud ·
            CLI + API
          </div>
        </div>
      </div>
    </section>
  )
}
