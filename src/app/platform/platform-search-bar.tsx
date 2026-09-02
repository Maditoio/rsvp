"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Props = {
  placeholder?: string;
  status?: boolean;
};

export function PlatformSearchBar({
  placeholder = "Search by name or slug…",
  status = true,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "all";

  const apply = (nextQ: string, nextStatus: string) => {
    const params = new URLSearchParams();
    const trimmed = nextQ.trim();
    if (trimmed) params.set("q", trimmed);
    if (status && nextStatus !== "all") params.set("status", nextStatus);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        apply(
          String(formData.get("q") ?? ""),
          String(formData.get("status") ?? "all"),
        );
      }}
    >
      <div className="min-w-0 flex-1">
        <Label htmlFor="platform-search">Search</Label>
        <div className="relative mt-1.5">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            strokeWidth={1.75}
            aria-hidden
          />
          <Input
            id="platform-search"
            name="q"
            defaultValue={q}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      </div>
      {status ? (
        <div className="sm:w-44">
          <Label htmlFor="platform-status">Status</Label>
          <Select
            id="platform-status"
            name="status"
            defaultValue={currentStatus}
            className="mt-1.5"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
      ) : null}
      <button
        type="submit"
        className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Search
      </button>
    </form>
  );
}
