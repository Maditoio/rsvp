import { OrganiserShell } from "@/components/shells/organiser-shell";
import { requireOrg } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";

export const dynamic = "force-dynamic";

export default async function OrgLayout({
  children,
  params,
}: LayoutProps<"/app/[orgSlug]">) {
  const { orgSlug } = await params;
  const ctx = await safe(() => requireOrg(orgSlug, "org.read"));
  return (
    <OrganiserShell
      orgName={ctx.organisation.name}
      orgSlug={orgSlug}
      grants={ctx.grants}
      orgRole={ctx.orgRole}
    >
      {children}
    </OrganiserShell>
  );
}
