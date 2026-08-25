import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  BadgeCheck,
  Building2,
  LayoutGrid,
  Mail,
  QrCode,
  Shield,
  UserRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/authz/require";
import { hasClerk } from "@/lib/utils";
import { loadUserWorkspaces } from "@/modules/workspaces/resolve";
import {
  WORKSPACE_KIND_LABELS,
  type UserWorkspace,
  type WorkspaceKind,
} from "@/modules/workspaces/types";
import { safe } from "@/lib/authz/safe";

export const dynamic = "force-dynamic";

function kindIcon(kind: WorkspaceKind) {
  switch (kind) {
    case "attendee":
      return UserRound;
    case "organiser":
      return Building2;
    case "event_operations":
      return QrCode;
    case "platform":
      return Shield;
    default:
      return LayoutGrid;
  }
}

function HomeHeader({ email }: { email: string | null }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
        <BrandLogo href="/home" size={32} wordmarkClassName="text-2xl" />
        <div className="flex min-w-0 items-center gap-3">
          {email ? (
            <p className="hidden truncate text-sm text-slate-500 sm:block">
              {email}
            </p>
          ) : null}
          {hasClerk() ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-9",
                },
              }}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}

function WorkspaceCard({ workspace }: { workspace: UserWorkspace }) {
  const Icon = kindIcon(workspace.kind);

  return (
    <Link
      href={workspace.href}
      className="group block rounded-xl bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">
              {workspace.label}
            </h2>
            <Badge tone="muted">{WORKSPACE_KIND_LABELS[workspace.kind]}</Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {workspace.description}
          </p>
        </div>
        <BadgeCheck
          className="size-4 shrink-0 text-slate-300 group-hover:text-indigo-600"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    </Link>
  );
}

function EmptyHome({ email }: { email: string | null }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <HomeHeader email={email} />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
          Welcome
        </p>
        <h1 className="mt-1 font-display text-4xl text-slate-900">
          Welcome to Bizcon RSVP
        </h1>
        <p className="mt-2 max-w-xl text-sm text-slate-600">
          Your account isn&apos;t linked to an event or organisation yet. What
          would you like to do?
        </p>

        <div className="mt-8 space-y-4">
          <Link
            href="/app/onboarding"
            className="flex items-start gap-4 rounded-xl bg-white p-5 shadow-sm transition-colors hover:bg-slate-50"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
              <Building2 className="size-5" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.0625rem] font-semibold text-slate-900">
                Create a workspace
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Host events, send invitations, and manage registration as an
                organiser.
              </p>
              <span className="mt-3 inline-flex text-sm font-semibold text-indigo-600">
                Continue →
              </span>
            </div>
          </Link>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <Mail className="size-5" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[1.0625rem] font-semibold text-slate-900">
                  I have an invitation
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Open the unique link in your invitation email to accept and
                  register. If you already registered, sign in with the same
                  email, then refresh this page.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href="/home"
                    className="inline-flex items-center justify-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"
                  >
                    Refresh
                  </Link>
                  <p className="text-sm text-slate-500">
                    Wrong account? Use the avatar to sign out.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default async function HomePage() {
  const user = await safe(() => getCurrentUser());
  const email = user?.email ?? null;
  const { workspaces, defaultHref } = await safe(() => loadUserWorkspaces());

  if (workspaces.length === 0) {
    return <EmptyHome email={email} />;
  }

  if (workspaces.length === 1 && defaultHref) {
    redirect(defaultHref);
  }

  const attendee = workspaces.filter((w) => w.kind === "attendee");
  const organiser = workspaces.filter((w) => w.kind === "organiser");
  const eventOps = workspaces.filter((w) => w.kind === "event_operations");
  const platform = workspaces.filter((w) => w.kind === "platform");

  return (
    <div className="min-h-screen bg-slate-50">
      <HomeHeader email={email} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="max-w-2xl">
          <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
            Choose workspace
          </p>
          <h1 className="mt-1 font-display text-4xl text-slate-900">
            Where would you like to go?
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account has access to multiple areas. Select the workspace that
            matches what you need to do right now.
          </p>
        </div>

        <div className="mt-8 space-y-8">
          {attendee.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
                Attendee
              </h2>
              {attendee.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} />
              ))}
            </section>
          ) : null}

          {organiser.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
                Organiser
              </h2>
              {organiser.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} />
              ))}
            </section>
          ) : null}

          {eventOps.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
                Event day
              </h2>
              {eventOps.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} />
              ))}
            </section>
          ) : null}

          {platform.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
                Platform
              </h2>
              {platform.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} />
              ))}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
