import { OrganiserShell } from "@/components/shells/organiser-shell";
import { SuspensionNotice } from "@/components/suspension-notice";
import { requireOrg } from "@/lib/authz/require";
import { isSuspensionError, suspensionScope } from "@/lib/authz/suspension";
import { fromAuthz, safe } from "@/lib/authz/safe";
import { loadUserWorkspaces } from "@/modules/workspaces/resolve";

export const dynamic = "force-dynamic";

export default async function OrgLayout({
  children,
  params,
}: LayoutProps<"/app/[orgSlug]">) {
  const { orgSlug } = await params;

  let ctx;
  try {
    ctx = await requireOrg(orgSlug, "org.read");
  } catch (error) {
    const scope = suspensionScope(error);
    if (isSuspensionError(error) && scope) {
      return <SuspensionNotice scope={scope} />;
    }
    fromAuthz(error);
  }

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
