"use client";

import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Info,
  Terminal,
  Zap,
} from "lucide-react";

// ── TOC structure ────────────────────────────────
type TocItem = { id: string; label: string; children?: { id: string; label: string }[] };

const toc: TocItem[] = [
  {
    id: "installation",
    label: "Installation",
    children: [
      { id: "prerequisites", label: "Prerequisites" },
      { id: "quick-start", label: "Quick start" },
      { id: "docker", label: "Docker" },
      { id: "env-vars", label: "Environment variables" },
    ],
  },
  {
    id: "quick-start-tour",
    label: "Quick start tour",
    children: [
      { id: "tour-org", label: "Organization & workspace" },
      { id: "tour-test", label: "First test" },
      { id: "tour-execution", label: "Execution" },
      { id: "tour-coverage", label: "Coverage" },
    ],
  },
  {
    id: "cli",
    label: "CLI guide",
    children: [
      { id: "cli-install", label: "Install" },
      { id: "cli-auth", label: "Authentication" },
      { id: "cli-commands", label: "Generated commands" },
      { id: "cli-json", label: "JSON & automation" },
      { id: "cli-mcp", label: "MCP for agents" },
      { id: "cli-ci", label: "CI usage" },
    ],
  },
  {
    id: "api",
    label: "API guide",
    children: [
      { id: "api-auth", label: "Authentication" },
      { id: "api-endpoints", label: "Endpoints" },
      { id: "api-examples", label: "Examples" },
      { id: "api-errors", label: "Error handling" },
    ],
  },
  {
    id: "jira",
    label: "Jira Cloud integration",
    children: [
      { id: "jira-oauth", label: "Create OAuth app" },
      { id: "jira-env", label: "Environment" },
      { id: "jira-connect", label: "Connect flow" },
      { id: "jira-sync", label: "Sync behavior" },
      { id: "jira-webhooks", label: "Webhooks" },
      { id: "jira-troubleshooting", label: "Troubleshooting" },
    ],
  },
  {
    id: "self-hosting",
    label: "Self-hosting & production",
    children: [
      { id: "prod-https", label: "HTTPS & APP_URL" },
      { id: "prod-postgres", label: "Postgres migration" },
      { id: "prod-backups", label: "Backups" },
      { id: "prod-monitoring", label: "Monitoring" },
      { id: "prod-rate-limiting", label: "Rate limiting" },
    ],
  },
  { id: "troubleshooting", label: "Troubleshooting & FAQ" },
];

// ── helpers ─────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-white/15 bg-white/10 px-2 text-[11px] font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang, className = "" }: { code: string; lang?: string; className?: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-[7px] border border-[#D8E0DB] bg-[#232E33] ${className}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/40">{lang ?? "bash"}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-[1.7] text-[#DDE8E1]">
        <code className="font-mono" style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}>{code}</code>
      </pre>
    </div>
  );
}

function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded-[3px] border border-[#D8E0DB] bg-[#E6EEEA] px-1.5 py-0.5 text-[12.5px] font-medium text-[#35434A]" style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}>
      {children}
    </code>
  );
}

function Callout({ variant = "info", title, children }: { variant?: "info" | "warning"; title?: string; children: React.ReactNode }) {
  const isWarn = variant === "warning";
  return (
    <div className={`flex gap-3 rounded-[6px] border px-4 py-3.5 ${isWarn ? "border-[#E8D5B0] bg-[#FDF6EE]" : "border-[#C7D9D3] bg-[#EEF5F0]"}`}>
      <span className={`mt-0.5 shrink-0 ${isWarn ? "text-[#8B641E]" : "text-[#526E69]"}`}>
        {isWarn ? <AlertTriangle size={16} /> : <Info size={16} />}
      </span>
      <div className="min-w-0">
        {title && <div className={`text-[13px] font-semibold ${isWarn ? "text-[#6B4F12]" : "text-[#35434A]"}`}>{title}</div>}
        <div className={`text-[13px] leading-[1.6] ${isWarn ? "text-[#6B4F12]/80" : "text-[#526E69]"}`}>{children}</div>
      </div>
    </div>
  );
}

function AnchorLink({ id }: { id: string }) {
  return (
    <a href={`#${id}`} aria-label="Link to this section" className="ml-2 opacity-0 transition-opacity group-hover:opacity-100 text-[#8A9B95] hover:text-[#526E69]">
      #
    </a>
  );
}

function SectionHeading({ id, children, level = 2 }: { id: string; children: React.ReactNode; level?: 2 | 3 }) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag id={id} className={`group flex items-center scroll-mt-24 ${level === 2 ? "text-[22px] font-semibold tracking-[-0.03em] text-[#35434A]" : "text-[16px] font-semibold tracking-[-0.02em] text-[#35434A]"}`}>
      {children}
      <AnchorLink id={id} />
    </Tag>
  );
}

// ── main page ────────────────────────────────────
export default function DocsPage() {
  const [activeId, setActiveId] = useState<string>("installation");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  // scroll spy
  useEffect(() => {
    const ids = toc.flatMap((s) => [s.id, ...(s.children?.map((c) => c.id) ?? [])]);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveId(e.target.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#35434A]">
      <Header />
      {/* hero bar */}
      <div className="border-b border-[#D8E0DB] bg-[#35434A] px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-[#DDE8E1]">
            <BookOpen size={12} /> Documentation
          </div>
          <h1 className="mt-4 text-[clamp(32px,4vw,44px)] font-semibold leading-[0.95] tracking-[-0.04em] text-[#F7F5F0]">Betaray docs</h1>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-[#F7F5F0]/60">
            Install, configure, and automate Betaray — from local development to self-hosted production.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[12px]">
            <span className="rounded-[4px] border border-white/15 px-2.5 py-1 text-[#F7F5F0]/70">Node 22+</span>
            <span className="rounded-[4px] border border-white/15 px-2.5 py-1 text-[#F7F5F0]/70">Docker ready</span>
            <span className="rounded-[4px] border border-white/15 px-2.5 py-1 text-[#F7F5F0]/70">Open source · MIT</span>
          </div>
        </div>
      </div>

      {/* mobile TOC toggle */}
      <div className="sticky top-[68px] z-30 border-b border-[#D8E0DB] bg-[#F7F5F0]/95 px-6 py-3 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setMobileTocOpen(!mobileTocOpen)}
          className="flex w-full items-center justify-between rounded-[6px] border border-[#D8E0DB] bg-white px-3 py-2.5 text-[13px] font-medium text-[#35434A]"
        >
          <span className="flex items-center gap-2"><BookOpen size={14} /> On this page</span>
          <ChevronRight size={14} className={`transition-transform ${mobileTocOpen ? "rotate-90" : ""}`} />
        </button>
        {mobileTocOpen && (
          <nav className="mt-3 rounded-[7px] border border-[#D8E0DB] bg-white p-3">
            {toc.map((s) => (
              <div key={s.id}>
                <a href={`#${s.id}`} onClick={() => setMobileTocOpen(false)} className="block rounded-[4px] px-2 py-1.5 text-[13px] font-medium text-[#35434A] hover:bg-[#E6EEEA]">{s.label}</a>
                {s.children && (
                  <div className="ml-3 border-l border-[#E6EEEA] pl-3">
                    {s.children.map((c) => (
                      <a key={c.id} href={`#${c.id}`} onClick={() => setMobileTocOpen(false)} className="block rounded-[4px] px-2 py-1 text-[12px] text-[#677676] hover:text-[#35434A]">{c.label}</a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        )}
      </div>

      <div className="mx-auto flex max-w-[1360px] gap-10 px-6 py-10 lg:px-10">
        {/* desktop sidebar */}
        <aside className="hidden w-[220px] shrink-0 lg:block">
          <nav className="sticky top-[88px] max-h-[calc(100vh-100px)] overflow-y-auto pr-2">
            {toc.map((section) => (
              <div key={section.id} className="mb-1">
                <a
                  href={`#${section.id}`}
                  className={`block rounded-[5px] px-2.5 py-1.5 text-[13px] font-medium transition-colors ${activeId === section.id ? "bg-[#35434A] text-[#F7F5F0]" : "text-[#35434A] hover:bg-[#E6EEEA]"}`}
                >
                  {section.label}
                </a>
                {section.children && (
                  <div className="ml-2 mt-0.5 border-l border-[#D8E0DB] pl-3">
                    {section.children.map((child) => (
                      <a
                        key={child.id}
                        href={`#${child.id}`}
                        className={`block rounded-[4px] px-2 py-1 text-[12px] transition-colors ${activeId === child.id ? "font-medium text-[#35434A]" : "text-[#677676] hover:text-[#35434A]"}`}
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="mt-6 rounded-[6px] border border-[#D8E0DB] bg-white p-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-[#8A9B95]">Need help?</div>
              <p className="mt-2 text-[12px] leading-[1.5] text-[#677676]">Open an issue or discussion on GitHub.</p>
              <a href="https://github.com/karthikmprakash/betaray/issues" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#526E69]">GitHub <ExternalLink size={11} /></a>
            </div>
          </nav>
        </aside>

        {/* content */}
        <main className="min-w-0 flex-1 space-y-14 pb-10">
          {/* ── 1. Installation ── */}
          <section className="space-y-6">
            <SectionHeading id="installation">1 · Installation</SectionHeading>

            <SectionHeading id="prerequisites" level={3}>Prerequisites</SectionHeading>
            <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-[1.65] text-[#3E5252]">
              <li><strong>Node.js 22+</strong> — check with <InlineCode>node --version</InlineCode>. Use <InlineCode>nvm</InlineCode> or <InlineCode>fnm</InlineCode> to manage versions.</li>
              <li><strong>Docker</strong> (optional) — for containerized deployment.</li>
              <li><strong>Git</strong> — to clone the repository.</li>
              <li>A Postgres database for production; SQLite works for local development.</li>
            </ul>

            <SectionHeading id="quick-start" level={3}>Quick start (local)</SectionHeading>
            <CodeBlock
              lang="bash"
              code={`git clone https://github.com/karthikmprakash/betaray.git
cd betaray
npm ci
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run dev -- --port 3001`}
            />
            <p className="text-[14px] leading-[1.65] text-[#677676]">
              Open <InlineCode>http://localhost:3001/login</InlineCode> and create an organization. Signup creates a workspace and first project automatically.
            </p>
            <Callout title="Local demo data">
              Set <InlineCode>ALLOW_LOCAL_DEMO=&quot;true&quot;</InlineCode> in <InlineCode>.env</InlineCode> to enable the <strong>Open local demo</strong> button at sign-in. This seeded data is disabled in production — it only works when <InlineCode>NODE_ENV !== &quot;production&quot;</InlineCode>.
            </Callout>

            <SectionHeading id="docker" level={3}>Docker</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">Pull a pre-built image from GHCR or build locally:</p>
            <CodeBlock
              lang="bash"
              code={`# Pull and run
docker run --env-file .env -p 3000:3000 ghcr.io/karthikmprakash/betaray:latest

# Or build locally
docker build -t betaray:local .
docker run --env-file .env -p 3000:3000 betaray:local`}
            />
            <p className="mt-4 text-[13px] font-medium text-[#35434A]">docker-compose example</p>
            <CodeBlock
              lang="yaml"
              code={`services:
  app:
    image: ghcr.io/karthikmprakash/betaray:latest
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [db]
    restart: unless-stopped
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: betaray
      POSTGRES_USER: betaray
      POSTGRES_PASSWORD: betaray
    volumes: [pgdata:/var/lib/postgresql/data]
    ports: ["5432:5432"]
volumes:
  pgdata:`}
            />
            <Callout>Images are published on every push to <InlineCode>main</InlineCode> as <InlineCode>main</InlineCode>, <InlineCode>main-&lt;sha&gt;</InlineCode>, and <InlineCode>latest</InlineCode>, plus <InlineCode>v*</InlineCode> on version tags.</Callout>

            <SectionHeading id="env-vars" level={3}>Environment variables</SectionHeading>
            <div className="overflow-x-auto rounded-[7px] border border-[#D8E0DB]">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#D8E0DB] bg-[#E6EEEA]">
                    <th className="px-4 py-2.5 font-semibold text-[#35434A]">Variable</th>
                    <th className="px-4 py-2.5 font-semibold text-[#35434A]">Required</th>
                    <th className="px-4 py-2.5 font-semibold text-[#35434A]">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EEEA]">
                  {[
                    ["DATABASE_URL", "Yes", "Database connection string. SQLite file:… for dev, Postgres URL for production."],
                    ["APP_URL", "Prod", "Canonical origin, e.g. https://qa.example.com. Used for OAuth callbacks and links."],
                    ["ALLOW_LOCAL_DEMO", "No", 'Set to "true" to enable seeded demo data (dev only, ignored in production).'],
                    ["JIRA_CLIENT_ID", "Jira", "Atlassian OAuth app client ID."],
                    ["JIRA_CLIENT_SECRET", "Jira", "Atlassian OAuth app client secret."],
                    ["JIRA_REDIRECT_URI", "Jira", "OAuth callback URL. Must match the Atlassian app config exactly."],
                    ["JIRA_TOKEN_KEY", "Jira", "32+ byte secret for AES-256-GCM encryption of Jira tokens at rest."],
                    ["OPENAI_API_KEY", "No", "OpenAI API key for AI test generation."],
                    ["OPENAI_MODEL", "No", "OpenAI model name (e.g. gpt-4o). Both OPENAI_* vars required for AI."],
                  ].map(([k, req, desc]) => (
                    <tr key={k} className="bg-white">
                      <td className="px-4 py-2.5 font-mono text-[12px] font-medium text-[#35434A]" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{k}</td>
                      <td className="px-4 py-2.5"><span className={`rounded-[3px] px-1.5 py-0.5 text-[11px] font-medium ${req === "Yes" ? "bg-[#FBF0EE] text-[#8F4739]" : req === "Prod" ? "bg-[#FDF6EE] text-[#8B641E]" : req === "Jira" ? "bg-[#EEF5EF] text-[#3D6B4C]" : "bg-[#F7F5F0] text-[#8A9B95]"}`}>{req}</span></td>
                      <td className="px-4 py-2.5 leading-[1.5] text-[#677676]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Callout variant="warning" title="Keep JIRA_TOKEN_KEY stable">
              Rotating this key makes all stored Jira OAuth tokens unreadable. Existing projects will need to reconnect.
            </Callout>
          </section>

          {/* ── 2. Quick start tour ── */}
          <section className="space-y-6">
            <SectionHeading id="quick-start-tour">2 · Quick start tour</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">After signing in, here is the happy path from zero to coverage report.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { step: "01", title: "Create organization", desc: "Sign up at /login. Enter an org name — a workspace and first project are created for you." },
                { step: "02", title: "Invite your team", desc: "Go to Settings → Members. Roles: Owner, Admin, Tester, Viewer. Each role scopes project access." },
                { step: "03", title: "Create a project", desc: "From the sidebar or workspace overview, create additional projects. Each has its own key prefix (e.g. BET-)." },
                { step: "04", title: "Add tests", desc: "Manual steps, Gherkin, or AI-generated drafts. Organize with folders and labels." },
              ].map((card) => (
                <div key={card.step} className="rounded-[7px] border border-[#D8E0DB] bg-white p-4">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A9B95]">{card.step}</div>
                  <div className="mt-1 text-[14px] font-semibold text-[#35434A]">{card.title}</div>
                  <p className="mt-1.5 text-[13px] leading-[1.6] text-[#677676]">{card.desc}</p>
                </div>
              ))}
            </div>

            <SectionHeading id="tour-org" level={3}>Organization → workspace → project</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">
              Betaray scopes everything under <strong>organization → workspace → project</strong>. Projects hold tests, executions, and integrations. You can archive and restore projects without losing data.
            </p>

            <SectionHeading id="tour-test" level={3}>First test</SectionHeading>
            <ol className="list-decimal space-y-2 pl-5 text-[14px] leading-[1.65] text-[#3E5252]">
              <li>Open your project → <strong>Tests</strong>.</li>
              <li>Click <strong>New test</strong> — choose Manual, Gherkin, or generate via AI Studio.</li>
              <li>Add steps or a feature/scenario, set priority/type, link a requirement if available.</li>
              <li>Save. Revisions are tracked; you can view history and restore any version.</li>
            </ol>

            <SectionHeading id="tour-execution" level={3}>Execution</SectionHeading>
            <ol className="list-decimal space-y-2 pl-5 text-[14px] leading-[1.65] text-[#3E5252]">
              <li>Create a <strong>Test Set</strong> or <strong>Test Plan</strong> to group related tests.</li>
              <li>Create an <strong>Execution</strong> from the set/plan — pick an environment (Staging, Production, …) and version.</li>
              <li>Run through each test, marking <InlineCode>PASS</InlineCode>, <InlineCode>FAIL</InlineCode>, <InlineCode>BLOCKED</InlineCode>, etc. Bulk-update and add comments.</li>
              <li>Or import results from CI — see <a href="#api-endpoints" className="font-medium text-[#526E69] underline">API guide</a> and <a href="#cli" className="font-medium text-[#526E69] underline">CLI guide</a>.</li>
            </ol>

            <SectionHeading id="tour-coverage" level={3}>Coverage</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">
              Link tests to requirements to build traceability. The <strong>Coverage</strong> view shows every requirement and whether it has passing tests. Export the matrix as evidence for audits or release reviews.
            </p>
          </section>

          {/* ── 3. CLI guide ── */}
          <section className="space-y-6">
            <SectionHeading id="cli">3 · CLI guide</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">Automate Betaray from your terminal, CI, or AI agents.</p>

            <SectionHeading id="cli-install" level={3}>Install</SectionHeading>
            <CodeBlock
              lang="bash"
              code={`# Global install (once published)
npm install -g betaray-cli
betaray --help

# One-off without installing
npx betaray-cli --help

# From source
git clone https://github.com/karthikmprakash/betaray.git
cd betaray/cli
npm install
npm run build
npm link              # makes \`betaray\` available globally
# or run directly
npx tsx src/index.ts --help
node dist/index.js --help`}
            />

            <SectionHeading id="cli-auth" level={3}>Authentication</SectionHeading>
            <CodeBlock lang="bash" code={`betaray login --url https://betaray.example.com --token btr_xxx

# Verify
betaray status
betaray whoami --json`} />
            <p className="text-[14px] leading-[1.65] text-[#677676]">Create the token in the Betaray UI: <strong>Integrations &amp; API → API Tokens → Create token</strong> (shown once — store it in your secrets).</p>
            <div className="rounded-[7px] border border-[#D8E0DB] bg-white p-4">
              <div className="text-[12px] font-semibold text-[#35434A]">Config file &amp; env vars</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-[1.6] text-[#677676]">
                <li>Config: <InlineCode>~/.betaray/config.json</InlineCode> (or <InlineCode>$XDG_CONFIG_HOME/betaray/config.json</InlineCode>). Override path with <InlineCode>BETARAY_CONFIG</InlineCode>.</li>
                <li>Env vars: <InlineCode>BETARAY_URL</InlineCode>, <InlineCode>BETARAY_TOKEN</InlineCode>, <InlineCode>BETARAY_PROJECT</InlineCode></li>
                <li>Precedence: <strong>CLI flag → env var → config file</strong></li>
                <li>Inspect: <InlineCode>betaray config get</InlineCode>, <InlineCode>betaray config path</InlineCode></li>
                <li>Remove: <InlineCode>betaray logout</InlineCode> or <InlineCode>betaray config reset</InlineCode></li>
              </ul>
            </div>

            <SectionHeading id="cli-commands" level={3}>Generated commands</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">
              The CLI fetches <InlineCode>GET /api/operations</InlineCode> and creates a command for
              every operation: <InlineCode>test.list</InlineCode> → <InlineCode>betaray test list</InlineCode>,
              <InlineCode>execution.import</InlineCode> → <InlineCode>betaray execution import</InlineCode>.
              New server features appear without a CLI release.
            </p>
            <div className="overflow-x-auto rounded-[7px] border border-[#D8E0DB]">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#D8E0DB] bg-[#E6EEEA]">
                    <th className="px-4 py-2.5 font-semibold text-[#35434A]">Command</th>
                    <th className="px-4 py-2.5 font-semibold text-[#35434A]">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EEEA]">
                  {[
                    ["betaray ops", "List every operation and its input schema"],
                    ["betaray login", "Save URL + token and verify the project"],
                    ["betaray status / whoami", "Check connectivity and identity"],
                    ["betaray test list", "List/search tests (--query, --label, --limit)"],
                    ["betaray test get --key MAIN-401", "Fetch one test by key"],
                    ["betaray test create", "Create a test (--summary, --steps, --labels, --folder)"],
                    ["betaray execution create", "Create an execution (--name, --test-keys, --env)"],
                    ["betaray execution import", "Import results (--key, --results)"],
                    ["betaray requirement list/coverage", "Read requirements and coverage"],
                    ["betaray call <operation>", "Invoke any operation with raw JSON"],
                    ["betaray mcp", "Run the stdio MCP server for agents"],
                    ["betaray config get/set/path/reset", "Manage local config"],
                  ].map(([cmd, desc]) => (
                    <tr key={cmd} className="bg-white">
                      <td className="px-4 py-2 font-mono text-[12px] font-medium text-[#35434A]" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{cmd}</td>
                      <td className="px-4 py-2 text-[#677676]">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[13px] leading-[1.6] text-[#677676]">
              Interactive-only operations (minting tokens, approving AI drafts, organization
              creation) require a signed-in browser session and are not generated as CLI commands.
            </p>
            <p className="text-[13px] font-medium text-[#35434A]">Examples</p>
            <CodeBlock
              lang="bash"
              code={`betaray ops --json
betaray test list --query login --label smoke --limit 20
betaray test create --summary "Login flow" --type Manual --priority High
betaray test create --summary "Checkout" --steps @steps.json
betaray execution create --name "Nightly" --test-keys MAIN-401,MAIN-402 --env Staging
betaray execution import --key MAIN-410 --results @results.json
betaray requirement coverage
betaray call requirement.coverage`}
            />

            <SectionHeading id="cli-json" level={3}>JSON mode &amp; automation</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">Every command supports <InlineCode>--json</InlineCode>; pipes are JSON by default. <InlineCode>--input</InlineCode> takes a whole JSON payload, <InlineCode>@file</InlineCode> reads a file, and <InlineCode>-</InlineCode> reads stdin:</p>
            <CodeBlock
              lang="bash"
              code={`echo '{"summary":"API test","type":"Generic"}' | betaray test create --input -
betaray requirement create --input @requirement.json
betaray test list --json | jq '.items[].key'
betaray whoami --json`}
            />
            <Callout>Global flags <InlineCode>--url</InlineCode>, <InlineCode>--token</InlineCode>, <InlineCode>--organization</InlineCode>, <InlineCode>--project</InlineCode> and <InlineCode>--json</InlineCode> work on every command. Use <InlineCode>--verbose</InlineCode> to log HTTP requests.</Callout>

            <SectionHeading id="cli-mcp" level={3}>MCP for agents</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">
              <InlineCode>betaray mcp</InlineCode> starts a stdio MCP server that relays to
              <InlineCode>/api/mcp</InlineCode>. Tools are generated from the same operation
              registry and filtered by the token&apos;s project and read/write scope.
            </p>
            <CodeBlock
              lang="json"
              code={`{
  "mcpServers": {
    "betaray": {
      "command": "betaray",
      "args": ["mcp"],
      "env": {
        "BETARAY_URL": "https://betaray.example.com",
        "BETARAY_TOKEN": "btr_xxx"
      }
    }
  }
}`}
            />
            <p className="text-[13px] leading-[1.6] text-[#677676]">
              Direct HTTP clients POST JSON-RPC to <InlineCode>/api/mcp</InlineCode> with a bearer token.
              Read tokens see read tools; write tokens see project write tools; token, member and
              organization administration is never exposed to API tokens.
            </p>

            <SectionHeading id="cli-ci" level={3}>CI usage — GitHub Actions</SectionHeading>
            <CodeBlock
              lang="yaml"
              code={`name: Report to Betaray
on: [push]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test  # your tests produce results.json
      - name: Install Betaray CLI
        run: npm install -g betaray-cli
      - name: Import execution results
        env:
          BETARAY_URL: \${{ secrets.BETARAY_URL }}
          BETARAY_TOKEN: \${{ secrets.BETARAY_TOKEN }}
        run: |
          betaray execution import \\
            --key \${{ vars.BETARAY_EXECUTION_KEY }} \\
            --results results.json`}
            />
            <p className="text-[13px] leading-[1.6] text-[#677676]">Store <InlineCode>BETARAY_TOKEN</InlineCode> in GitHub → Settings → Secrets. Use a <strong>write</strong>-scoped token created in the Betaray UI.</p>
          </section>

          {/* ── 4. API guide ── */}
          <section className="space-y-6">
            <SectionHeading id="api">4 · API guide</SectionHeading>

            <SectionHeading id="api-auth" level={3}>Authentication</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">
              Create a project-scoped token in <strong>Integrations &amp; API</strong> (read or write scope, optional expiry, revocable, hashed at rest — shown once).
            </p>
            <CodeBlock lang="bash" code={`curl -H "Authorization: Bearer $BETARAY_TOKEN" \\
  "$APP_URL/api/tests?projectId=YOUR_PROJECT_ID"`} />
            <Callout>Tokens are per-project and read/write scoped. <InlineCode>/api/platform</InlineCode> accepts a token and returns a project-confined view; use <InlineCode>/api/operations</InlineCode> or <InlineCode>/api/mcp</InlineCode> for agent workflows.</Callout>

            <SectionHeading id="api-endpoints" level={3}>Endpoints</SectionHeading>
            <div className="overflow-x-auto rounded-[7px] border border-[#D8E0DB]">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#D8E0DB] bg-[#E6EEEA]">
                    <th className="px-4 py-2.5 font-semibold text-[#35434A]">Method</th>
                    <th className="px-4 py-2.5 font-semibold text-[#35434A]">Path</th>
                    <th className="px-4 py-2.5 font-semibold text-[#35434A]">Auth</th>
                    <th className="px-4 py-2.5 font-semibold text-[#35434A]">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EEEA]">
                  {[
                    ["GET", "/api/tests?projectId=…", "Bearer", "List tests"],
                    ["POST", "/api/tests", "Bearer", "Create test {projectId, summary, …}"],
                    ["POST", "/api/v2/import/execution", "Bearer", "Import execution results"],
                    ["GET", "/api/operations", "None", "Operation manifest + JSON Schemas"],
                    ["POST", "/api/operations", "Bearer", "Invoke any allowed operation"],
                    ["POST", "/api/mcp", "Bearer", "Streamable HTTP MCP endpoint"],
                    ["GET", "/api/platform?projectId=…", "Bearer / Session", "Read a project-confined state"],
                    ["POST", "/api/platform", "Bearer / Session", "Mutate ({action, projectId, input})"],
                    ["GET", "/api/health", "None", "Health check"],
                  ].map(([m, p, a, d]) => (
                    <tr key={p} className="bg-white">
                      <td className="px-4 py-2"><span className={`rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold ${m === "GET" ? "bg-[#E6EEEA] text-[#435b57]" : "bg-[#35434A] text-[#F7F5F0]"}`}>{m}</span></td>
                      <td className="px-4 py-2 font-mono text-[12px] text-[#35434A]" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{p}</td>
                      <td className="px-4 py-2 text-[#677676]">{a}</td>
                      <td className="px-4 py-2 text-[#677676]">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SectionHeading id="api-examples" level={3}>Examples</SectionHeading>
            <p className="text-[13px] font-medium text-[#35434A]">List tests</p>
            <CodeBlock
              lang="bash"
              code={`curl "$APP_URL/api/tests?projectId=proj_123" \\
  -H "Authorization: Bearer $BETARAY_TOKEN"`}
            />
            <p className="mt-4 text-[13px] font-medium text-[#35434A]">Create a test</p>
            <CodeBlock
              lang="bash"
              code={`curl -X POST "$APP_URL/api/tests" \\
  -H "Authorization: Bearer $BETARAY_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "proj_123",
    "summary": "Login with valid credentials",
    "type": "Manual",
    "priority": "High",
    "labels": ["smoke"],
    "steps": [{"action": "Enter credentials", "expected": "Dashboard appears"}]
  }'`}
            />
            <p className="mt-4 text-[13px] font-medium text-[#35434A]">Import execution results (up to 500 test runs atomically)</p>
            <CodeBlock
              lang="bash"
              code={`curl -X POST "$APP_URL/api/v2/import/execution" \\
  -H "Authorization: Bearer $BETARAY_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "proj_123",
    "testExecutionKey": "BET-1",
    "tests": [
      {"testKey": "BET-T1", "status": "PASS"},
      {"testKey": "BET-T2", "status": "FAIL", "comment": "Timeout on 3DS challenge"}
    ]
  }'`}
            />
            <p className="mt-2 text-[13px] leading-[1.6] text-[#677676]">
              Allowed statuses: <InlineCode>TODO</InlineCode> <InlineCode>PASS</InlineCode> <InlineCode>FAIL</InlineCode> <InlineCode>EXECUTING</InlineCode> <InlineCode>ABORTED</InlineCode> <InlineCode>BLOCKED</InlineCode>
            </p>

            <SectionHeading id="api-errors" level={3}>Error handling</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">Errors return JSON with a status code and message:</p>
            <CodeBlock lang="json" code={`{ "error": "Test BET-T99 is not part of this execution.", "status": 400 }`} />
            <div className="overflow-x-auto rounded-[7px] border border-[#D8E0DB]">
              <table className="w-full text-left text-[13px]">
                <thead><tr className="border-b border-[#D8E0DB] bg-[#E6EEEA]"><th className="px-4 py-2 font-semibold text-[#35434A]">Status</th><th className="px-4 py-2 font-semibold text-[#35434A]">Meaning</th></tr></thead>
                <tbody className="divide-y divide-[#E6EEEA]">
                  {[
                    ["400", "Validation error — missing field or test not in execution"],
                    ["401", "Missing or invalid token / session"],
                    ["403", "Insufficient role or scope (write required for mutations)"],
                    ["404", "Project, execution, or test not found"],
                    ["429", "Rate limited (when enabled)"],
                  ].map(([c, m]) => (
                    <tr key={c} className="bg-white"><td className="px-4 py-2 font-mono font-medium text-[#35434A]">{c}</td><td className="px-4 py-2 text-[#677676]">{m}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── 5. Jira Cloud integration ── */}
          <section className="space-y-6">
            <SectionHeading id="jira">5 · Jira Cloud integration</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">Connect Betaray to Jira Cloud via OAuth 2.0 (3LO). Jira issues are imported as Requirements and kept in sync.</p>

            <SectionHeading id="jira-oauth" level={3}>Create the Atlassian OAuth app</SectionHeading>
            <ol className="list-decimal space-y-2 pl-5 text-[14px] leading-[1.65] text-[#3E5252]">
              <li>Open <a href="https://developer.atlassian.com/console/myapps/" target="_blank" rel="noopener noreferrer" className="font-medium text-[#526E69] underline">developer.atlassian.com/console/myapps <ExternalLink size={11} className="inline" /></a></li>
              <li>Create an <strong>OAuth 2.0 integration</strong>.</li>
              <li>Add <strong>Jira platform API</strong> permissions:
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["read:jira-work", "write:jira-work", "read:jira-user", "manage:jira-webhook", "offline_access"].map((s) => (
                    <span key={s} className="rounded-[3px] border border-[#D8E0DB] bg-white px-2 py-1 font-mono text-[11px] text-[#35434A]">{s}</span>
                  ))}
                </div>
              </li>
              <li>Set the callback URL to:
                <CodeBlock className="mt-2" lang="text" code={`https://your-betaray-host/api/integrations/jira/callback`} />
                <span className="text-[12px] text-[#8A9B95]">For local dev: <InlineCode>http://localhost:3001/api/integrations/jira/callback</InlineCode></span>
              </li>
            </ol>

            <SectionHeading id="jira-env" level={3}>Environment</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">Add to <InlineCode>.env</InlineCode> and restart:</p>
            <CodeBlock
              lang="env"
              code={`JIRA_CLIENT_ID="..."
JIRA_CLIENT_SECRET="..."
JIRA_REDIRECT_URI="https://your-betaray-host/api/integrations/jira/callback"
JIRA_TOKEN_KEY="<random 32+ byte secret>"
APP_URL="https://your-betaray-host"`}
            />
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-[1.65] text-[#677676]">
              <li><InlineCode>JIRA_REDIRECT_URI</InlineCode> must match the Atlassian app callback exactly. If omitted, it is derived from <InlineCode>APP_URL</InlineCode> or the request origin.</li>
              <li>Generate <InlineCode>JIRA_TOKEN_KEY</InlineCode> with: <InlineCode>openssl rand -base64 48</InlineCode> — it encrypts tokens at rest with AES-256-GCM.</li>
            </ul>
            <Callout variant="warning">Keep <InlineCode>JIRA_TOKEN_KEY</InlineCode> stable. Rotating it makes stored tokens unreadable — projects must reconnect.</Callout>

            <SectionHeading id="jira-connect" level={3}>Connect flow</SectionHeading>
            <ol className="list-decimal space-y-1.5 pl-5 text-[14px] leading-[1.65] text-[#3E5252]">
              <li>Sign in as <strong>Owner</strong> or <strong>Admin</strong>.</li>
              <li>Open a project → <strong>Integrations &amp; API → Jira Cloud</strong>.</li>
              <li>Click <strong>Connect Jira Cloud</strong> and authorize.</li>
              <li>Choose the Jira project to map → <strong>Save mapping</strong>.</li>
              <li>Click <strong>Sync now</strong>.</li>
            </ol>
            <p className="text-[13px] leading-[1.6] text-[#677676]">Imported issues appear under <strong>Requirements</strong>. Their local keys are the Jira issue keys, so existing test links continue to work.</p>

            <SectionHeading id="jira-sync" level={3}>Sync behavior</SectionHeading>
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-[1.65] text-[#677676]">
              <li>One-way: Jira → Betaray. Idempotent by <InlineCode>(connection, jiraIssueKey)</InlineCode>.</li>
              <li>Fields: summary, description, issue type, status, priority. Jira types map to Story / Bug / Epic / Task.</li>
              <li>Fetched via <InlineCode>/rest/api/3/search/jql</InlineCode> in pages of 50 with cursor-based <InlineCode>nextPageToken</InlineCode>.</li>
              <li>Existing local issues with the same key are linked and updated.</li>
              <li>Deleted Jira issues are not removed locally.</li>
            </ul>

            <SectionHeading id="jira-webhooks" level={3}>Webhooks &amp; expiry</SectionHeading>
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-[1.65] text-[#677676]">
              <li>Optional dynamic webhook handles <InlineCode>issue_created</InlineCode>, <InlineCode>issue_updated</InlineCode>, <InlineCode>issue_deleted</InlineCode>.</li>
              <li>Jira expires REST-registered webhooks after <strong>30 days</strong>. Each manual <strong>Sync now</strong> extends the webhook; saving the mapping re-registers it.</li>
              <li>If webhook registration is unavailable, sync still works.</li>
            </ul>

            <div className="overflow-x-auto rounded-[7px] border border-[#D8E0DB]">
              <table className="w-full text-left text-[13px]">
                <thead><tr className="border-b border-[#D8E0DB] bg-[#E6EEEA]"><th className="px-4 py-2 font-semibold text-[#35434A]">Route</th><th className="px-4 py-2 font-semibold text-[#35434A]">Purpose</th></tr></thead>
                <tbody className="divide-y divide-[#E6EEEA]">
                  {[
                    ["GET /api/integrations/jira?projectId=…", "Connection status"],
                    ["GET /api/integrations/jira/authorize?projectId=…", "Start OAuth"],
                    ["GET /api/integrations/jira/callback", "OAuth callback"],
                    ["GET /api/integrations/jira/projects?projectId=…", "List Jira projects"],
                    ["POST /api/integrations/jira/configure", "Save mapping & register webhook"],
                    ["POST /api/integrations/jira/sync", "Manual sync"],
                    ["POST /api/integrations/jira/webhook?connection=…&token=…", "Jira event receiver"],
                    ["DELETE /api/integrations/jira?projectId=…", "Disconnect"],
                  ].map(([r, p]) => (
                    <tr key={r} className="bg-white"><td className="px-4 py-2 font-mono text-[12px] text-[#35434A]" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{r}</td><td className="px-4 py-2 text-[#677676]">{p}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[12px] leading-[1.6] text-[#8A9B95]">All management routes require Owner/Admin. The webhook route is unauthenticated but requires a per-connection secret in its URL.</p>

            <SectionHeading id="jira-troubleshooting" level={3}>Troubleshooting</SectionHeading>
            <div className="space-y-3">
              {[
                { q: "OAuth error: redirect_uri mismatch", a: "The Atlassian app callback URL and JIRA_REDIRECT_URI must be identical, including protocol and trailing slash. Check for https vs http." },
                { q: "Tokens unreadable after deploy", a: "JIRA_TOKEN_KEY changed. Restore the previous value or reconnect each project." },
                { q: "Webhook not firing", a: "Expired after 30 days — run Sync now to extend it. Verify the webhook was registered (check server logs)." },
                { q: "Multiple Jira sites", a: "One site per Betaray project. The first accessible site is selected. Reconnecting a different site clears the old mapping; imported requirements remain." },
                { q: "No Jira projects listed", a: "Ensure the authorizing Atlassian account has access to the Jira site and projects." },
              ].map((item) => (
                <div key={item.q} className="rounded-[6px] border border-[#D8E0DB] bg-white p-4">
                  <div className="text-[13px] font-semibold text-[#35434A]">{item.q}</div>
                  <p className="mt-1 text-[13px] leading-[1.6] text-[#677676]">{item.a}</p>
                </div>
              ))}
            </div>
            <Callout>
              OAuth state is HMAC-signed and expires after 10 minutes. Tokens are never returned to the browser. Disconnecting deletes the Jira webhook then removes local credentials — imported requirements remain.
            </Callout>
          </section>

          {/* ── 6. Self-hosting & production ── */}
          <section className="space-y-6">
            <SectionHeading id="self-hosting">6 · Self-hosting &amp; production</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">Betaray is designed to run anywhere — VPS, Kubernetes, or your own data center.</p>

            <SectionHeading id="prod-https" level={3}>HTTPS &amp; APP_URL</SectionHeading>
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-[1.65] text-[#677676]">
              <li>Always set <InlineCode>APP_URL</InlineCode> to your canonical origin (e.g. <InlineCode>https://qa.example.com</InlineCode>) in production. It is used for OAuth callbacks, links in emails, and same-origin checks.</li>
              <li>Terminate TLS at a reverse proxy (Caddy, nginx, Traefik) or cloud load balancer.</li>
              <li>Sessions use <InlineCode>HttpOnly</InlineCode>, <InlineCode>Secure</InlineCode> cookies in production — they require HTTPS.</li>
            </ul>

            <SectionHeading id="prod-postgres" level={3}>Postgres migration</SectionHeading>
            <p className="text-[14px] leading-[1.65] text-[#677676]">
              SQLite works for development; production should use Postgres.
            </p>
            <CodeBlock
              lang="env"
              code={`DATABASE_URL="postgresql://betaray:secret@db:5432/betaray?schema=public"`}
            />
            <p className="text-[13px] leading-[1.65] text-[#677676]">Update <InlineCode>prisma/schema.prisma</InlineCode> datasource to <InlineCode>postgresql</InlineCode>, run <InlineCode>npx prisma migrate deploy</InlineCode>, and restart. The Docker image runs migrations on startup automatically.</p>

            <SectionHeading id="prod-backups" level={3}>Backups</SectionHeading>
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-[1.65] text-[#677676]">
              <li>For SQLite: snapshot the <InlineCode>prisma/dev.db</InlineCode> file (or <InlineCode>./data/prod.db</InlineCode> in Docker) regularly.</li>
              <li>For Postgres: use <InlineCode>pg_dump</InlineCode> or your cloud provider&apos;s automated backups. Test restores.</li>
              <li>Back up <InlineCode>JIRA_TOKEN_KEY</InlineCode> and other secrets separately — without it, Jira tokens cannot be decrypted.</li>
            </ul>

            <SectionHeading id="prod-monitoring" level={3}>Monitoring</SectionHeading>
            <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-[1.65] text-[#677676]">
              <li>Health check: <InlineCode>GET /api/health</InlineCode> — use for load balancer / uptime probes.</li>
              <li>Structured logs go to stdout — collect with your log aggregator.</li>
              <li>Watch for failed Jira syncs and webhook expiries in server logs.</li>
            </ul>

            <SectionHeading id="prod-rate-limiting" level={3}>Rate limiting</SectionHeading>
            <p className="text-[13px] leading-[1.65] text-[#677676]">
              Betaray does not ship built-in rate limiting. In production, place a reverse proxy or API gateway in front that rate-limits by IP and token. Consider throttling <InlineCode>/api/tests</InlineCode> and <InlineCode>/api/v2/import/execution</InlineCode> to protect against noisy CI pipelines.
            </p>
            <Callout variant="warning" title="Before going live">
              Review: email verification, password recovery, MFA/SSO, Postgres, HTTPS, backups, rate limiting, monitoring, and audit retention. Betaray is a working foundation — not a compliance certification.
            </Callout>
          </section>

          {/* ── 7. Troubleshooting & FAQ ── */}
          <section className="space-y-6">
            <SectionHeading id="troubleshooting">7 · Troubleshooting &amp; FAQ</SectionHeading>

            <div className="space-y-3">
              {[
                { q: "npm ci fails — Node version error", a: "Betaray requires Node 22+. Run node --version and upgrade via nvm install 22 or fnm install 22." },
                { q: "Database locked / migration fails", a: "Ensure no other process holds the SQLite file. For Postgres, verify DATABASE_URL and that the DB is reachable. Run npx prisma migrate deploy manually to see detailed errors." },
                { q: "Login returns 401", a: "Check that the password is correct and the account exists. Sessions are HttpOnly cookies — ensure cookies are enabled and APP_URL matches your origin for same-origin checks." },
                { q: "ALLOW_LOCAL_DEMO not working", a: 'It only works when NODE_ENV !== "production" and the env var is exactly "true". Restart after changing .env.' },
                { q: "Execution import: Test not part of execution", a: "Only tests included in the execution can have results imported. Add the test to the execution first via the UI or API." },
                { q: "Execution import: Execution not found", a: "The testExecutionKey must match an existing execution key in the project. Check the key prefix (e.g. BET-1) and projectId." },
                { q: "Docker container exits immediately", a: "Check docker logs <container>. Missing DATABASE_URL or a bad .env is the most common cause. Ensure the env file path is correct." },
                { q: "Jira sync imports nothing", a: "Verify the Jira project mapping is saved and the Jira project has issues. Check server logs for JQL/API errors. Ensure JIRA_* env vars are set." },
                { q: "Can I use Betaray without Jira?", a: "Yes — Jira integration is optional. All test management features work standalone. Connect Jira later when needed." },
                { q: "Can I self-host on Kubernetes?", a: "Yes. Use the GHCR image with a Postgres service. Mount secrets via Kubernetes Secrets, set APP_URL to your ingress host, and run migrations on deploy." },
                { q: "How do I back up and restore?", a: "For SQLite, copy the DB file. For Postgres, use pg_dump / pg_restore. Always back up JIRA_TOKEN_KEY alongside the database." },
                { q: "Does Betaray support SSO / SAML?", a: "Not yet. Auth is email/password with scrypt hashing and throttling. SSO is on the roadmap — contributions welcome." },
              ].map((item) => (
                <details key={item.q} className="group rounded-[6px] border border-[#D8E0DB] bg-white">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[13px] font-medium text-[#35434A]">
                    {item.q}
                    <ChevronRight size={14} className="shrink-0 text-[#8A9B95] transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="border-t border-[#E6EEEA] px-4 py-3 text-[13px] leading-[1.6] text-[#677676]">{item.a}</p>
                </details>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-[7px] border border-[#D8E0DB] bg-[#35434A] px-5 py-4">
              <Zap size={16} className="text-[#DDE8E1]" />
              <span className="text-[13px] text-[#F7F5F0]/80">Still stuck? Open an issue on</span>
              <a href="https://github.com/karthikmprakash/betaray/issues" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-[#F7F5F0] underline">GitHub <ExternalLink size={12} /></a>
            </div>
          </section>

          {/* bottom nav */}
          <div className="flex flex-wrap gap-3 border-t border-[#D8E0DB] pt-8">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#526E69] hover:text-[#35434A]">← Back to home</Link>
            <span className="text-[#C7D1CA]">·</span>
            <Link href="/app" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#526E69] hover:text-[#35434A]">Open Betaray <ExternalLink size={12} /></Link>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
