import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { log } from "./logger";

export function serveStatic(app: Express) {
  const candidates = [
    path.resolve(import.meta.dirname, "public"), // dist/public when running bundled server
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(process.cwd(), "server/public"),
  ];
  const distPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!distPath) {
    log(
      `Client build not found (tried: ${candidates.join(", ")}). API-only mode.`,
    );
    app.get("*", (_req, res) => {
      res
        .status(503)
        .type("text")
        .send("Client build missing. Redeploy after a successful Vite build.");
    });
    return;
  }

  log(`Serving static client from ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
