/** Normalize legacy /uploads paths to authenticated /api/uploads paths. */
export function authUploadUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("/uploads/")) {
    return `/api${url}`;
  }
  return url;
}
