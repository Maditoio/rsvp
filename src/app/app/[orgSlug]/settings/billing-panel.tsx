"use client";

export function BillingPanel() {
  return (
    <div className="max-w-xl rounded-md border border-stone-200 bg-stone-0 p-6">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-bronze-500">
        Billing
      </p>
      <h2 className="mt-1 font-display text-[1.375rem] font-semibold text-ink-700">
        Plan & invoicing
      </h2>
      <p className="mt-2 text-[0.9375rem] text-stone-700">
        Billing management for this organisation is not available in this
        release. Contact your Bizcon RSVP account manager for plan changes.
      </p>
    </div>
  );
}
