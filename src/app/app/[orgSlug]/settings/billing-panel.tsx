"use client";

export function BillingPanel() {
  return (
    <div className="max-w-xl rounded-xl bg-white shadow-sm p-6">
      <p className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-indigo-600">
        Billing
      </p>
      <h2 className="mt-1 text-[1.375rem] font-semibold text-slate-900">
        Plan & invoicing
      </h2>
      <p className="mt-2 text-[0.9375rem] text-slate-700">
        Billing management for this organisation is not available in this
        release. Contact your Bizcon RSVP account manager for plan changes.
      </p>
    </div>
  );
}
