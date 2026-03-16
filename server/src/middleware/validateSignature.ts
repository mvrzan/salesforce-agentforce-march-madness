import { type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../utils/loggingUtil.ts";

export function validateSignature(req: Request, res: Response, next: NextFunction) {
  logger.info("validateSignature.ts", "Request received");

  const secret = process.env.API_SECRET;
  const path = req.originalUrl || req.url;
  const requestMethod = req.method;

  if (!secret) {
    logger.error("validateSignature.ts", "API_SECRET not configured in environment");
    return res.status(500).json({ error: "Server configuration error" });
  }

  const timestamp = req.headers["x-timestamp"];
  const receivedSignature = req.headers["x-signature"];

  if (!timestamp || !receivedSignature || Array.isArray(timestamp) || Array.isArray(receivedSignature)) {
    logger.error("validateSignature.ts", "Missing authentication headers");
    return res.status(401).json({ error: "Missing authentication headers" });
  }

  const now = Date.now();
  const requestTime = parseInt(timestamp, 10);
  const timeDiff = Math.abs(now - requestTime);

  if (timeDiff > 300000) {
    logger.error("validateSignature.ts", `Request timestamp expired. Time diff: ${timeDiff}ms`);
    return res.status(401).json({ error: "Request expired" });
  }

  const message = `${timestamp}${requestMethod.toUpperCase()}${path}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(message);
  const expectedSignature = hmac.digest("hex");

  if (receivedSignature !== expectedSignature) {
    logger.error("validateSignature.ts", "Invalid signature", {
      expected: expectedSignature,
      received: receivedSignature,
      message,
    });
    return res.status(401).json({ error: "Invalid signature" });
  }

  logger.info("validateSignature.ts", "Request signature validated");
  next();
}
