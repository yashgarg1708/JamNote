import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import fs from "fs";
import path from "path";

import { healthRouter } from "./routes/health.routes";
import { authRouter } from "./routes/auth.routes";
import { notesRouter } from "./routes/notes.routes";
import { notebooksRouter } from "./routes/notebooks.routes";
import { errorHandler, notFound } from "./middlewares/error";
import { env } from "./config/env";

export const app = express();

app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header (curl/mobile/native) is allowed.
      if (!origin) return callback(null, true);

      // If no explicit allowlist is configured, allow all origins.
      if (env.CORS_ORIGINS.length === 0) return callback(null, true);

      if (env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/notebooks", notebooksRouter);
app.use("/api/notes", notesRouter);

const frontendDist = path.resolve(__dirname, "../../front_end/dist");
const frontendIndex = path.join(frontendDist, "index.html");

if (fs.existsSync(frontendIndex)) {
  app.use(express.static(frontendDist));

  // SPA fallback for non-API GET routes.
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(frontendIndex);
  });
}

app.use(notFound);
app.use(errorHandler);
