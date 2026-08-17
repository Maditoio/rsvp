/** Phase 1 file storage (Vercel Blob) for CSV/XLSX imports and exports. */
export type StoredFile = {
  url: string;
  pathname: string;
  contentType?: string;
};

export const FILE_KINDS = [
  "CONTACT_IMPORT",
  "EXPORT",
  "EVENT_ASSET",
  "OTHER",
] as const;
