import "../app/workspace.css"
import { SignIn } from "@/components/app/SignIn"
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>
}) {
  const { returnTo } = await searchParams
  return (
    <SignIn
      allowDemo={
        process.env.NODE_ENV !== "production" &&
        process.env.ALLOW_LOCAL_DEMO === "true"
      }
      invitation={!!returnTo?.startsWith("/invite?")}
    />
  )
}
