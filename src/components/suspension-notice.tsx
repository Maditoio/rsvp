import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type Props = {
  scope: "organisation" | "event";
};

const copy = {
  event: {
    title: "Event suspended",
    description:
      "This event has been suspended by a system administrator. Contact an administrator to resolve this issue.",
  },
  organisation: {
    title: "Organisation suspended",
    description:
      "This organisation has been suspended by a system administrator. Contact an administrator to resolve this issue.",
  },
} as const;

export function SuspensionNotice({ scope }: Props) {
  const content = copy[scope];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suspension-notice-title"
      aria-describedby="suspension-notice-description"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <div className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <ShieldAlert className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
        <h1
          id="suspension-notice-title"
          className="mt-4 text-xl font-semibold text-slate-900"
        >
          {content.title}
        </h1>
        <p
          id="suspension-notice-description"
          className="mt-2 text-sm leading-relaxed text-slate-600"
        >
          {content.description}
        </p>
        <div className="mt-6 flex justify-end">
          <Link
            href="/home"
            className="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-accent hover:bg-indigo-700"
          >
            Back to workspaces
          </Link>
        </div>
      </div>
    </div>
  );
}
