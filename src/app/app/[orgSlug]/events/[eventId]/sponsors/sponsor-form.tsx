"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import {
  updateEventSponsorAction,
  uploadEventSponsorLogoAction,
} from "@/modules/sponsors/actions";
import {
  EVENT_SPONSOR_TIERS,
  EVENT_SPONSOR_TIER_LABELS,
  type EventSponsorRecord,
  type EventSponsorTierId,
} from "@/modules/sponsors/config";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { prepareImageForUpload } from "@/modules/files/prepare-image-upload";
import { friendlyUploadFailure } from "@/modules/files/image-upload";

type Props = {
  orgSlug: string;
  eventId: string;
  sponsor: EventSponsorRecord;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function SponsorForm({
  orgSlug,
  eventId,
  sponsor,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [tier, setTier] = useState<EventSponsorTierId>(sponsor.tier);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  return (
    <>
      {trigger ? (
        <button type="button" onClick={() => setOpen(true)} className="text-left">
          {trigger}
        </button>
      ) : null}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Edit sponsor"
        description="Update the sponsor name, tier, website, or logo."
        size="sm"
      >
        <form
          ref={formRef}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(formRef.current!);
            formData.set("tier", tier);
            formData.set("id", sponsor.id);

            start(async () => {
              try {
                const result = await updateEventSponsorAction(
                  orgSlug,
                  eventId,
                  formData,
                );

                if (!result.ok) {
                  setError(result.error);
                  toast.error(result.error);
                  return;
                }

                if (logoFile) {
                  const prepared = await prepareImageForUpload(logoFile, "logo");
                  if (!prepared.ok) {
                    setError(prepared.error);
                    toast.error(prepared.error);
                    return;
                  }
                  const logoFd = new FormData();
                  logoFd.set("sponsorId", sponsor.id);
                  logoFd.set("logo", prepared.file);
                  const upload = await uploadEventSponsorLogoAction(
                    orgSlug,
                    eventId,
                    logoFd,
                  );
                  if (!upload.ok) {
                    setError(upload.error);
                    toast.error(upload.error);
                    return;
                  }
                }

                formRef.current?.reset();
                setLogoFile(null);
                setOpen(false);
                toast.success("Sponsor updated.");
                router.refresh();
              } catch (err) {
                const message = friendlyUploadFailure(
                  err,
                  "logo",
                  "Could not update sponsor.",
                );
                setError(message);
                toast.error(message);
              }
            });
          }}
        >
          <div>
            <Label htmlFor="sponsor-name">Name</Label>
            <Input
              id="sponsor-name"
              name="name"
              defaultValue={sponsor.name}
              placeholder="Optional display name"
            />
            <p className="mt-1 text-xs text-slate-400">
              Leave blank to keep the current name. Logos are shown prominently on
              the event website.
            </p>
          </div>

          <div>
            <Label htmlFor="sponsor-tier">Tier</Label>
            <Select
              id="sponsor-tier"
              value={tier}
              onChange={(e) => setTier(e.target.value as EventSponsorTierId)}
              className="mt-1.5"
            >
              {EVENT_SPONSOR_TIERS.map((tierId) => (
                <option key={tierId} value={tierId}>
                  {EVENT_SPONSOR_TIER_LABELS[tierId]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="sponsor-website">Website URL</Label>
            <Input
              id="sponsor-website"
              name="websiteUrl"
              type="url"
              defaultValue={sponsor.websiteUrl ?? ""}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <Label>Logo</Label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {sponsor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sponsor.logoUrl}
                  alt={sponsor.name}
                  className="h-10 max-w-[120px] rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-10 w-24 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                  No logo
                </div>
              )}
              <input
                ref={logoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={() => {
                  const file = logoRef.current?.files?.[0] ?? null;
                  setLogoFile(file);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leadingIcon={<Upload className="size-4" strokeWidth={1.75} />}
                onClick={() => logoRef.current?.click()}
              >
                {logoFile ? logoFile.name : "Replace logo"}
              </Button>
            </div>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}
