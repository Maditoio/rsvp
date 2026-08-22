import { requireUser } from "@/lib/authz/require";
import { safe } from "@/lib/authz/safe";

export const dynamic = "force-dynamic";

export default async function HomeLayout({
  children,
}: LayoutProps<"/home">) {
  await safe(() => requireUser());
  return children;
}
