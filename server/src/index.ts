import express from "express";
import cors from "cors";
import { getCurrentTimestamp } from "./utils/loggingUtil.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import agentforceApiRoutes from "./routes/agentforceApi.ts";
import resultsRoutes from "./routes/resultsRoutes.ts";
import bracketRoutes from "./routes/bracketRoutes.ts";
import agentforceTools from "./routes/agentforceTools.ts";

const app = express();
const port = process.env.APP_PORT || process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(agentforceApiRoutes);
app.use(resultsRoutes);
app.use(bracketRoutes);
app.use(agentforceTools);

app.use(express.static("public"));

// Centralized error handler — must be last
app.use(errorHandler);

app.listen(port, () => {
  console.log(`${getCurrentTimestamp()} 🎬 - index - Server listening on port: ${port}`);
});
