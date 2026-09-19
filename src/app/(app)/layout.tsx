import { AppShell } from "@/features/shell/components/app-shell"
import { UserMenu } from "@/features/auth/components/user-menu"
import { getCurrentUser } from "@/shared/lib/supabase/server"

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser()

  return (
    <AppShell
      account={user?.email ? <UserMenu email={user.email} /> : undefined}
    >
      {children}
    </AppShell>
  )
}
