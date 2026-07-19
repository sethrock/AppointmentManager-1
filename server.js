/**
 * Production Node server entry for Vercel (and local `npm start`).
 * Requires `npm run build` first so ./dist/index.js exists.
 */
import app from "./dist/index.js";
import { createServer } from "node:http";

const port = Number(process.env.PORT) || 5050;
const server = createServer(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`serving on port ${port}`);
});
