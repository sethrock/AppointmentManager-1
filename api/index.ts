/**
 * Vercel serverless entry — re-exports the Express app.
 * Client assets are built into dist/public via `npm run build`.
 */
import app from "../server/index.js";

export default app;
