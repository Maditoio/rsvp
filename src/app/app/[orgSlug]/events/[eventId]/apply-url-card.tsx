"use client";

import { Download } from "lucide-react";

export function ApplyQrBadge({
  dataUrl,
  eventName,
}: {
  dataUrl: string;
  eventName: string;
}) {
  function download() {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${eventName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}-apply-qr.png`;
    a.click();
  }

  return (
    <button
      type="button"
      onClick={download}
      className="group relative shrink-0 rounded-md bg-white p-2"
      title="Download QR code"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="Apply page QR code"
        width={96}
        height={96}
        className="block size-24"
      />
      <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <Download className="size-6 text-white" />
      </span>
    </button>
  );
}
