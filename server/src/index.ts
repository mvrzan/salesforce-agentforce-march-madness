import express from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "./utils/loggingUtil.ts";
import { validateEnv } from "./types/env.ts";
import { requestLoggerMiddleware } from "./middleware/requestLoggerMiddleware.ts";
import agentforceApiRoutes from "./routes/agentforceApi.ts";
import resultsRoutes from "./routes/resultsRoutes.ts";
import bracketRoutes from "./routes/bracketRoutes.ts";
import agentforceTools from "./routes/agentforceTools.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const app = express();
const port = process.env.APP_PORT ?? process.env.PORT ?? 3000;

validateEnv();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLoggerMiddleware);

// Routes
app.use(agentforceApiRoutes);
app.use(resultsRoutes);
app.use(bracketRoutes);
app.use(agentforceTools);

app.use(express.static(publicDir));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(join(publicDir, "index.html"));
});

app.listen(port, () => {
  logger.info("index.ts", `Server listening on port: ${port}`);
});
