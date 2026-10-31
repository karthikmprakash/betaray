import "./workspace.css"
import { AppShell } from "@/components/app/AppShell"
import { AppDataProvider } from "@/lib/appData"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <AppShell>{children}</AppShell>
    </AppDataProvider>
  )
}
