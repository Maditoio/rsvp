export function QrCodeImage({
  dataUrl,
  label = "Attendance check-in code",
  showLabel = true,
}: {
  dataUrl: string;
  label?: string;
  /** When true, render the label above the QR (print-style). */
  showLabel?: boolean;
}) {
  return (
    <div className="inline-flex flex-col items-center rounded-2xl bg-white p-5">
      {showLabel ? (
        <p className="mb-3 max-w-[280px] text-center text-base font-semibold leading-snug text-slate-900">
          {label}
        </p>
      ) : null}
      {/* data: URLs are generated locally from the opaque token */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt={label}
        width={280}
        height={280}
        className="h-[280px] w-[280px]"
      />
    </div>
  );
}
