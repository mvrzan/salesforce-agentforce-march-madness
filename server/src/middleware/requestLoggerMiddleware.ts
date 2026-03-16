import { type Request, type Response, type NextFunction } from "express";
import { logger } from "../utils/loggingUtil.ts";

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("requestLoggerMiddleware.ts", `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};
