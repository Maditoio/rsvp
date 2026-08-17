import { AttendeeShell } from "@/components/shells/attendee-shell";
import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";

export const dynamic = "force-dynamic";

export default async function AttendeeLayout({
  children,
}: LayoutProps<"/me">) {
  await safe(() => requireUser());
  return <AttendeeShell>{children}</AttendeeShell>;
}
