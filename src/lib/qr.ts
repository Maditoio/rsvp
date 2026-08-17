import QRCode from "qrcode";

/** Encode only the opaque attendance token — never names, emails, or event IDs. */
export async function opaqueQrDataUrl(token: string) {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: {
      dark: "#1b1e2a",
      light: "#ffffff",
    },
  });
}
