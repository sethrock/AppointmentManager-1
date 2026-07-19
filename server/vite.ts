import type { Express } from "express";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

/** Dev-only Vite middleware. Loaded dynamically so production never imports vite/rollup. */
export async function setupVite(app: Express, server: Server) {
  const viteModule = await import("vite");
  const viteConfigModule = await import("../vite.config");
  const createViteServer = viteModule.createServer;
  const createLogger = viteModule.createLogger;
  const viteConfig = viteConfigModule.default;
  const viteLogger = createLogger();

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    } as any,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
