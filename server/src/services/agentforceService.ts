import salesforceSdk from "@heroku/applink";
import { type Response as ExpressResponse } from "express";
import { logger } from "../utils/loggingUtil.ts";

const AGENTFORCE_BASE_URL = "https://api.salesforce.com/einstein/ai-agent/v1";

export const getAgentforceAuth = async (): Promise<{ accessToken: string; instanceUrl: string }> => {
  const connectionName = process.env.APP_LINK_CONNECTION_NAME;
  if (!connectionName) throw new Error("APP_LINK_CONNECTION_NAME environment variable is not set");

  const sdk = salesforceSdk.init();
  const auth = await sdk.addons.applink.getAuthorization(connectionName);
  return { accessToken: auth.accessToken, instanceUrl: auth.domainUrl };
};

export const createAgentSession = async (
  accessToken: string,
  instanceUrl: string,
  agentId: string,
  externalSessionKey: string,
): Promise<{ sessionId: string; messages: unknown }> => {
  const response = await fetch(`${AGENTFORCE_BASE_URL}/agents/${agentId}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      externalSessionKey,
      instanceConfig: { endpoint: instanceUrl },
      streamingCapabilities: { chunkTypes: ["Text"] },
      bypassUser: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("agentforceService.ts", `createAgentSession error: ${response.status} - ${errorText}`);
    throw new Error(`Failed to start Agentforce session: ${response.statusText}`);
  }

  return response.json();
};

export const removeAgentSession = async (accessToken: string, sessionId: string): Promise<void> => {
  const response = await fetch(`${AGENTFORCE_BASE_URL}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "x-session-end-reason": "UserRequest",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("agentforceService.ts", `removeAgentSession error: ${response.status} - ${errorText}`);
    throw new Error(`Failed to delete Agentforce session: ${response.statusText}`);
  }
};

export const sendAgentMessage = async (
  accessToken: string,
  sessionId: string,
  message: { sequenceId: number; type: string; text: string },
): Promise<globalThis.Response> => {
  const response = await fetch(`${AGENTFORCE_BASE_URL}/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("agentforceService.ts", `sendAgentMessage error: ${response.status} - ${errorText}`);
    throw new Error(`Failed to send Agentforce message: ${response.statusText}`);
  }

  return response;
};

export const pipeStreamToResponse = async (
  source: globalThis.Response,
  res: ExpressResponse,
  logModule: string,
): Promise<void> => {
  if (!source.body) throw new Error("Response body is null");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const reader = source.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        logger.info(logModule, "Stream complete");
        if ("flush" in res && typeof res.flush === "function") res.flush();
        res.end();
        break;
      }

      res.write(decoder.decode(value, { stream: true }));
      if ("flush" in res && typeof res.flush === "function") res.flush();
    }
  } catch (streamError) {
    const msg = streamError instanceof Error ? streamError.message : String(streamError);
    logger.error(logModule, `Stream error: ${msg}`);
    res.end();
  }
};
