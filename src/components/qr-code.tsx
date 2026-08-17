export function QrCodeImage({
  dataUrl,
  label = "Attendance check-in code",
}: {
  dataUrl: string;
  label?: string;
}) {
  return (
    <div className="inline-flex flex-col items-center rounded-2xl bg-white p-5">
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
