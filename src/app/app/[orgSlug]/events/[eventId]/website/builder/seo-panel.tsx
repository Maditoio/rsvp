"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { EventSiteConfig } from "@/modules/event-sites/config";

type Props = {
  config: EventSiteConfig;
  onChange: (config: EventSiteConfig) => void;
};

export function SeoPanel({ config, onChange }: Props) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Search & sharing</h2>
        <p className="mt-1 text-sm text-slate-600">
          Control how your event website appears in search results and when shared on social media.
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="seoTitle">Page title</Label>
            <Input
              id="seoTitle"
              className="mt-1.5"
              value={config.seo.title}
              placeholder="Leave blank to use event name"
              onChange={(e) =>
                onChange({ ...config, seo: { ...config.seo, title: e.target.value } })
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Recommended: 50–60 characters. Shown in browser tabs and search results.
            </p>
          </div>
          <div>
            <Label htmlFor="seoDesc">Meta description</Label>
            <textarea
              id="seoDesc"
              rows={4}
              className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm"
              value={config.seo.description}
              placeholder="Brief summary of your event"
              onChange={(e) =>
                onChange({
                  ...config,
                  seo: { ...config.seo, description: e.target.value },
                })
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Recommended: 120–160 characters. Used in search snippets and link previews.
            </p>
          </div>
          <div>
            <Label htmlFor="seoKeywords">Keywords</Label>
            <Input
              id="seoKeywords"
              className="mt-1.5"
              value={config.seo.keywords.join(", ")}
              placeholder="conference, summit, networking"
              onChange={(e) =>
                onChange({
                  ...config,
                  seo: {
                    ...config.seo,
                    keywords: e.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean)
                      .slice(0, 12),
                  },
                })
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Comma-separated. Up to 12 keywords.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
