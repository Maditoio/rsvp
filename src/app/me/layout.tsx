import { AttendeeShell } from "@/components/shells/attendee-shell";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { loadUserWorkspaces } from "@/modules/workspaces/resolve";

export const dynamic = "force-dynamic";

export default async function AttendeeLayout({
  children,
}: LayoutProps<"/me">) {
  await safe(() => requireUser());
  const { workspaces } = await safe(() => loadUserWorkspaces());
  return <AttendeeShell workspaces={workspaces}>{children}</AttendeeShell>;
}
