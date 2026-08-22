import { OrganiserShell } from "@/components/shells/organiser-shell";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";
import { loadUserWorkspaces } from "@/modules/workspaces/resolve";

export const dynamic = "force-dynamic";

export default async function OrgLayout({
  children,
  params,
}: LayoutProps<"/app/[orgSlug]">) {
  const { orgSlug } = await params;
  const ctx = await safe(() => requireOrg(orgSlug, "org.read"));
  const { workspaces } = await safe(() => loadUserWorkspaces());
  return (
    <OrganiserShell
      orgName={ctx.organisation.name}
      orgSlug={orgSlug}
      grants={ctx.grants}
      orgRole={ctx.orgRole}
      workspaces={workspaces}
    >
      {children}
    </OrganiserShell>
  );
}
