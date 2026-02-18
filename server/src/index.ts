import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { getCurrentTimestamp } from "./utils/loggingUtil.ts";

const app = express();
const port = process.env.APP_PORT || process.env.PORT || 3000;
const baseUrl = process.env.APP_URL || `http://localhost:${port}`;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(port, () => {
  console.log(`${getCurrentTimestamp()} 🎬 - index - Authentication server listening on port: ${port}`);
});
