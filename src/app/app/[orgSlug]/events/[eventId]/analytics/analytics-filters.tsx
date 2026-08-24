"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/lib/countries";

type CategoryOption = { id: string; name: string };

export function AnalyticsFiltersBar({
  orgSlug,
  eventId,
  categories,
  initial,
}: {
  orgSlug: string;
  eventId: string;
  categories: CategoryOption[];
  initial: {
    categoryId: string;
    country: string;
    company: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, start] = useTransition();

  function apply(formData: FormData) {
    const params = new URLSearchParams(searchParams.toString());
    const categoryId = String(formData.get("categoryId") ?? "").trim();
    const country = String(formData.get("country") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();

    if (categoryId) params.set("categoryId", categoryId);
    else params.delete("categoryId");
    if (country) params.set("country", country);
    else params.delete("country");
    if (company) params.set("company", company);
    else params.delete("company");

    start(() => {
      const query = params.toString();
      router.push(
        `/app/${orgSlug}/events/${eventId}/analytics${query ? `?${query}` : ""}`,
      );
    });
  }

  function clearFilters() {
    start(() => {
      router.push(`/app/${orgSlug}/events/${eventId}/analytics`);
    });
  }

  const hasFilters = Boolean(initial.categoryId || initial.country || initial.company);

  return (
    <form
      className="rounded-xl bg-white p-4 shadow-sm"
      action={apply}
    >
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[10rem] flex-1">
          <Label htmlFor="analytics-category">Category</Label>
          <Select
            id="analytics-category"
            name="categoryId"
            className="mt-1"
            defaultValue={initial.categoryId}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[10rem] flex-1">
          <Label htmlFor="analytics-country">Country</Label>
          <Select
            id="analytics-country"
            name="country"
            className="mt-1"
            defaultValue={initial.country}
          >
            <option value="">All countries</option>
            {COUNTRIES.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[10rem] flex-1">
          <Label htmlFor="analytics-company">Company</Label>
          <Input
            id="analytics-company"
            name="company"
            className="mt-1"
            placeholder="Filter by company…"
            defaultValue={initial.company}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Applying…" : "Apply filters"}
          </Button>
          {hasFilters ? (
            <Button type="button" variant="ghost" disabled={pending} onClick={clearFilters}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>
      {hasFilters ? (
        <p className="mt-3 text-xs text-slate-500">
          Showing filtered segment. Clear filters to see event-wide aggregates.
        </p>
      ) : null}
    </form>
  );
}
