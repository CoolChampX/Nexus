import cors from "cors";
import express from "express";
import morgan from "morgan";

import { env } from "./config/env.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "developer-qa-backend"
  });
});

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "Backend is running",
    health: "/health",
    api: "/api"
  });
});

app.use("/api", apiRouter);
app.use(notFound);
app.use(errorHandler);
