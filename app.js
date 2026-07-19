import express from "express";
import application from "./dist/index.js";

// Vercel Express autodetection requires this entry file to import `express`.
void express;

export default application;
