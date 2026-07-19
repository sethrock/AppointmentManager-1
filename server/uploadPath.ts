import path from "path";

/** Writable upload root. Vercel functions only allow writes under /tmp. */
export function getUploadRoot(): string {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return path.join("/tmp", "uploads");
  }
  return path.resolve("uploads");
}
