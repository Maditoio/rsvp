import QRCode from "qrcode";

export type QrColorOptions = {
  dark?: string;
  light?: string;
  width?: number;
};

/** Encode only the opaque attendance token — never names, emails, or event IDs. */
export async function opaqueQrDataUrl(
  token: string,
  colors?: QrColorOptions,
) {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: colors?.width ?? 280,
    color: {
      dark: colors?.dark ?? "#1b1e2a",
      light: colors?.light ?? "#ffffff",
    },
  });
}

/** QR data URL for a public URL (apply page, landing page, etc.). */
export async function urlQrDataUrl(url: string, colors?: QrColorOptions) {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: colors?.width ?? 200,
    color: {
      dark: colors?.dark ?? "#1F2937",
      light: colors?.light ?? "#ffffff",
    },
  });
}

/** Client-safe preview QR (same encoder; not an attendance token). */
export async function previewQrDataUrl(
  payload: string,
  colors?: QrColorOptions,
) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: colors?.width ?? 280,
    color: {
      dark: colors?.dark ?? "#1b1e2a",
      light: colors?.light ?? "#ffffff",
    },
  });
}
