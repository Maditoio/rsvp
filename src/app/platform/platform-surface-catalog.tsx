import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PlatformSurfaceGroup } from "@/modules/platform/surfaces";
import { WORKSPACE_KIND_LABELS } from "@/modules/workspaces/types";

function kindTone(kind?: PlatformSurfaceGroup["links"][number]["kind"]) {
  if (kind === "attendee") return "success" as const;
  if (kind === "organiser") return "default" as const;
  if (kind === "event_operations") return "warning" as const;
  if (kind === "platform") return "accent" as const;
  return "muted" as const;
}

function kindLabel(kind?: PlatformSurfaceGroup["links"][number]["kind"]) {
  if (!kind || kind === "route") return "Route";
  return WORKSPACE_KIND_LABELS[kind];
}

export function PlatformSurfaceCatalog({
  groups,
}: {
  groups: PlatformSurfaceGroup[];
}) {
  if (groups.length === 0) {
    return (
      <Card>
        <p className="text-sm text-stone-700">No surface routes to display yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group.id}>
          <div className="max-w-3xl">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-600">
              {group.id.startsWith("event_roles:")
                ? "Event role"
                : group.id.startsWith("event_attendee:")
                  ? "Attendee"
                  : group.id.startsWith("event_routes:")
                    ? "Organiser event"
                    : group.id.startsWith("org:")
                      ? "Organisation"
                      : "Workspace"}
            </p>
            <h2 className="mt-1 font-display text-2xl text-ink-800">{group.title}</h2>
            {group.description ? (
              <p className="mt-1 text-sm text-stone-600">{group.description}</p>
            ) : null}
          </div>

          <div className="mt-5 divide-y divide-stone-200 rounded-md border border-stone-200">
            {group.links.map((link) => (
              <div
                key={`${group.id}:${link.href}:${link.roleLabel ?? link.label}`}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink-800">{link.label}</p>
                    {link.roleLabel ? (
                      <Badge tone={kindTone(link.kind)}>{link.roleLabel}</Badge>
                    ) : null}
                    <Badge tone="muted">{kindLabel(link.kind)}</Badge>
                  </div>
                  {link.description ? (
                    <p className="mt-1 text-sm text-stone-600">{link.description}</p>
                  ) : null}
                  <p className="mt-1 font-mono text-xs text-stone-500">{link.href}</p>
                </div>
                <Link
                  href={link.href}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-stone-200 bg-stone-0 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-stone-50"
                >
                  Open
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
