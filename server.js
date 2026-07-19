import express from "express";
import app from "./dist/index.js";

// Required for Vercel Express autodetection
void express;

const port = Number(process.env.PORT) || 5050;

// Vercel intercepts listen(); locally this serves production builds.
app.listen(port, () => {
  console.log(`serving on port ${port}`);
});

export default app;
