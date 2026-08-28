import "server-only";

/** True when server-side Vercel Blob uploads can authenticate. */
export function isBlobStorageConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    return true;
  }
  // Vercel injects OIDC + store id at runtime when a Blob store is connected.
  if (
    process.env.BLOB_STORE_ID?.trim() &&
    (process.env.VERCEL_OIDC_TOKEN?.trim() || process.env.VERCEL)
  ) {
    return true;
  }
  return false;
}

export function blobStorageNotConfiguredMessage(): string {
  if (process.env.VERCEL) {
    return (
      "File storage is not configured on this deployment. In Vercel → Project → Settings → Environment Variables, edit the existing BLOB_READ_WRITE_TOKEN (do not add a duplicate) or connect a Blob store under Storage. Then redeploy."
    );
  }
  return (
    "File storage is not configured locally. Add BLOB_READ_WRITE_TOKEN to .env (copy from Vercel → Storage → your Blob store, or run `vercel env pull`), then restart the dev server."
  );
}
