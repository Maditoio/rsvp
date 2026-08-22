import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  LayoutGrid,
  QrCode,
  Shield,
  UserRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Badge } from "@/components/ui/badge";
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

function WorkspaceCard({ workspace }: { workspace: UserWorkspace }) {
  const Icon = kindIcon(workspace.kind);

  return (
    <Link
      href={workspace.href}
      className="group block rounded-md border border-stone-200 bg-stone-0 p-5 transition-colors hover:border-ink-300 hover:bg-stone-50"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-stone-100 text-ink-700 group-hover:bg-ink-700 group-hover:text-white">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[1.0625rem] font-semibold text-ink-800">
              {workspace.label}
            </h2>
            <Badge tone="muted">{WORKSPACE_KIND_LABELS[workspace.kind]}</Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-stone-600">
            {workspace.description}
          </p>
        </div>
        <BadgeCheck
          className="size-4 shrink-0 text-stone-300 group-hover:text-bronze-600"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const { workspaces, defaultHref } = await safe(() => loadUserWorkspaces());

  if (workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-stone-0">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <BrandLogo href="/home" size={32} wordmarkClassName="text-2xl" />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="font-display text-3xl text-ink-800">No workspaces yet</h1>
          <p className="mt-2 text-sm text-stone-700">
            You are signed in, but no attendee registration, organisation
            membership, or platform access is linked to this account yet.
          </p>
        </main>
      </div>
    );
  }

  if (workspaces.length === 1 && defaultHref) {
    redirect(defaultHref);
  }

  const attendee = workspaces.filter((w) => w.kind === "attendee");
  const organiser = workspaces.filter((w) => w.kind === "organiser");
  const eventOps = workspaces.filter((w) => w.kind === "event_operations");
  const platform = workspaces.filter((w) => w.kind === "platform");

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-stone-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-bronze-600">
              Bizcon RSVP
            </p>
            <div className="mt-1">
              <BrandLogo href="/home" size={32} wordmarkClassName="text-2xl" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="max-w-2xl">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
            Choose workspace
          </p>
          <h1 className="mt-1 font-display text-4xl text-ink-800">
            Where would you like to go?
          </h1>
          <p className="mt-2 text-sm text-stone-700">
            Your account has access to multiple areas. Select the workspace that
            matches what you need to do right now.
          </p>
        </div>

        <div className="mt-8 space-y-8">
          {attendee.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                Attendee
              </h2>
              {attendee.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} />
              ))}
            </section>
          ) : null}

          {organiser.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                Organiser
              </h2>
              {organiser.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} />
              ))}
            </section>
          ) : null}

          {eventOps.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
                Event day
              </h2>
              {eventOps.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} />
              ))}
            </section>
          ) : null}

          {platform.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-stone-500">
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
