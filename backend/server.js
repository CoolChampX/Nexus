import cors from "cors";
import express from "express";
import morgan from "morgan";

import { connectDatabase } from "./src/config/db.js";
import { env } from "./src/config/env.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { notFound } from "./src/middleware/notFound.js";
import { apiRouter } from "./src/routes/index.js";

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientUrls.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
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

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(env.port, () => {
      console.log(`Backend running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    process.exit(1);
  }
};


startServer();
export default app;
