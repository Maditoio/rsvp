"use client";

import { useState, useTransition } from "react";
import { Copy, Globe, Loader2, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  removeEventCustomDomain,
  setEventCustomDomain,
  verifyEventCustomDomain,
  type EventCustomDomainResult,
} from "@/modules/event-sites/custom-domain-actions";
import { recommendedDnsRecords } from "@/modules/event-sites/custom-domain";
import type { EventCustomDomainState } from "@/modules/event-sites/service";

type Props = {
  orgSlug: string;
  eventId: string;
  customDomain: EventCustomDomainState;
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  none: { label: "Not connected", className: "bg-slate-100 text-slate-600" },
  pending: { label: "Pending DNS", className: "bg-amber-50 text-amber-700" },
  verified: { label: "Connected", className: "bg-teal-50 text-teal-700" },
  error: { label: "Needs attention", className: "bg-rose-50 text-rose-700" },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_LABEL[status] ?? STATUS_LABEL.none;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}

export function DomainPanel({ orgSlug, eventId, customDomain: initial }: Props) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [state, setState] = useState<EventCustomDomainResult>({
    domain: initial.domain,
    status: (initial.status as EventCustomDomainResult["status"]) ?? "none",
    error: initial.error,
    dnsRecords: initial.domain ? recommendedDnsRecords(initial.domain) : [],
    vercelManaged: false,
  });
  const [inputValue, setInputValue] = useState(initial.domain ?? "");
  const [removeConfirm, setRemoveConfirm] = useState(false);

  function applyResult(result: EventCustomDomainResult) {
    setState(result);
    setInputValue(result.domain ?? "");
  }

  function save() {
    if (!inputValue.trim()) {
      toast.error("Enter a domain first.");
      return;
    }
    start(async () => {
      const result = await setEventCustomDomain(orgSlug, eventId, inputValue);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      applyResult(result.data);
      toast.success(
        result.data.status === "verified"
          ? "Domain connected."
          : "Domain saved. Add the DNS record below, then verify.",
      );
    });
  }

  function verify() {
    start(async () => {
      const result = await verifyEventCustomDomain(orgSlug, eventId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      applyResult(result.data);
      toast[result.data.status === "verified" ? "success" : "error"](
        result.data.status === "verified"
          ? "Domain verified and connected."
          : result.data.error || "DNS isn't pointing to us yet.",
      );
    });
  }

  function remove() {
    start(async () => {
      const result = await removeEventCustomDomain(orgSlug, eventId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setState({ domain: null, status: "none", error: null, dnsRecords: [], vercelManaged: false });
      setInputValue("");
      setRemoveConfirm(false);
      toast.success("Custom domain removed.");
    });
  }

  const records = state.domain ? state.dnsRecords : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Globe className="size-4 text-indigo-600" aria-hidden />
              Custom domain
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Point your own domain (e.g. <span className="font-mono">tickets.yourcompany.com</span>) at this
              event&apos;s website instead of the default address. Each event connects its own domain.
            </p>
          </div>
          {state.domain ? <StatusBadge status={state.status} /> : null}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="customDomain">Domain</Label>
            <div className="mt-1.5 flex gap-2">
              <Input
                id="customDomain"
                placeholder="tickets.yourcompany.com"
                value={inputValue}
                disabled={pending}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Button type="button" size="sm" disabled={pending} onClick={save}>
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {state.domain ? "Update" : "Connect"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              A subdomain (like <span className="font-mono">tickets.yourcompany.com</span>) is simpler to set up
              than a root domain (like <span className="font-mono">yourcompany.com</span>).
            </p>
          </div>

          {state.domain && state.status !== "verified" ? (
            <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-sm font-medium text-amber-900">Add this DNS record</p>
              <p className="text-xs text-amber-800">
                In your domain provider&apos;s DNS settings, add the record below. It can take a few minutes to a
                few hours to take effect.
              </p>
              <div className="space-y-2">
                {records.map((record) => (
                  <div
                    key={`${record.type}-${record.host}`}
                    className="flex flex-wrap items-center gap-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-xs"
                  >
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono font-semibold text-amber-800">
                      {record.type}
                    </span>
                    <span className="font-mono text-slate-700">Host: {record.host}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-slate-700">
                      Value: {record.value}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(record.value);
                        toast.success("Copied.");
                      }}
                    >
                      <Copy className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
              {state.error ? <p className="text-xs text-rose-600">{state.error}</p> : null}
              <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={verify}>
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="size-3.5" aria-hidden />
                )}
                Verify DNS
              </Button>
            </div>
          ) : null}

          {state.domain && state.status === "verified" ? (
            <div className="rounded-md border border-teal-200 bg-teal-50/60 p-4">
              <p className="text-sm text-teal-900">
                <span className="font-medium">{state.domain}</span> is connected. Visitors can now reach this
                event&apos;s published website directly at that address.
              </p>
            </div>
          ) : null}

          {state.domain ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setRemoveConfirm(true)}
                className="text-rose-600 hover:bg-rose-50"
              >
                Remove domain
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={removeConfirm}
        onClose={() => setRemoveConfirm(false)}
        title="Remove custom domain?"
        description="Visitors will no longer be able to reach this event's website using this domain."
        confirmLabel="Remove domain"
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}
