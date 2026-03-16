import { logger } from "../utils/loggingUtil.ts";
import salesforceSdk from "@heroku/applink";
import { type Request, type Response, type NextFunction } from "express";

type SdkInstance = ReturnType<typeof salesforceSdk.init> & { asyncComplete?: boolean };

type SdkRequest = Request & {
  sdk: SdkInstance;
  log?: unknown;
  route: NonNullable<Request["route"]> & {
    salesforceConfig?: { parseRequest?: boolean };
  };
};

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

const initSalesforceSdk = async () => {
  logger.info("herokuServiceMesh.ts", "Loading up the middleware");

  const salesforceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const sdkReq = req as SdkRequest;
    sdkReq.sdk = salesforceSdk.init();

    const skipParsing = sdkReq.route?.salesforceConfig?.parseRequest === false;

    if (!skipParsing) {
      try {
        const parsedRequest = sdkReq.sdk.salesforce.parseRequest(req.headers, req.body, sdkReq.log ?? console);

        sdkReq.sdk = Object.assign(sdkReq.sdk, parsedRequest);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("herokuServiceMesh.ts", `Salesforce authentication error: ${errorMessage}`);

        return res.status(401).json({
          error: "Invalid request",
          message: "Missing or invalid Salesforce authentication",
        });
      }
    }
    next();
  };

  const withSalesforceConfig = (options: SdkRequest["route"]["salesforceConfig"] = {}) => {
    return (req: Request, _res: Response, next: NextFunction) => {
      (req as SdkRequest).route.salesforceConfig = options;
      next();
    };
  };

  const asyncMiddleware = (handler: AsyncHandler) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      logger.info("herokuServiceMesh.ts", `Async response for ${req.method} ${req.path}`);

      const routeKey = `${req.method} ${req.path}`;

      res.status(201).send({
        message: `Async ${routeKey} completed!`,
      });

      try {
        await handler(req, res);
        (req as SdkRequest).sdk.asyncComplete = true;
        logger.info("herokuServiceMesh.ts", `Async ${routeKey} completed`);
      } catch (error) {
        logger.error("herokuServiceMesh.ts", `Error in async handler for ${routeKey}`, error);
      }
      next();
    };
  };

  logger.info("herokuServiceMesh.ts", "Middleware ready");

  return {
    salesforceMiddleware,
    asyncMiddleware,
    withSalesforceConfig,
  };
};

export default initSalesforceSdk;
