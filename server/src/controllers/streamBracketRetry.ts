import { type Request, type Response } from "express";
import { getCurrentTimestamp } from "../utils/loggingUtil.ts";
import salesforceSdk from "@heroku/applink";

const streamBracketRetry = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`${getCurrentTimestamp()} 🔄 - streamBracketRetry - Request received...`);

    const { sessionId, missingMatchupIds, sequenceId } = req.body as {
      sessionId: string;
      missingMatchupIds: string[];
      sequenceId: number;
    };

    if (!Array.isArray(missingMatchupIds) || missingMatchupIds.length === 0) {
      res.status(400).json({ message: "missingMatchupIds must be a non-empty array" });
      return;
    }

    const message = `You missed picks for these matchups: ${missingMatchupIds.join(", ")}. Please provide picks for each one now.`;

    console.log(
      `${getCurrentTimestamp()} 🎯 - streamBracketRetry - Session: ${sessionId}, Sequence: ${sequenceId}, Missing: ${missingMatchupIds.join(", ")}`,
    );

    const connectionName = process.env.APP_LINK_CONNECTION_NAME;
    if (!connectionName) {
      throw new Error("APP_LINK_CONNECTION_NAME environment variable is not set");
    }

    const sdk = salesforceSdk.init();
    const auth = await sdk.addons.applink.getAuthorization(connectionName);
    const accessToken = (auth as unknown as { accessToken: string }).accessToken;

    const body = {
      message: {
        sequenceId,
        type: "Text",
        text: message,
      },
    };

    console.log(`${getCurrentTimestamp()} 🤖 - streamBracketRetry - Sending Agentforce message...`);

    const response = await fetch(
      `https://api.salesforce.com/einstein/ai-agent/v1/sessions/${sessionId}/messages/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `${getCurrentTimestamp()} ❌ - streamBracketRetry - API Error: ${response.status} ${response.statusText}`,
      );
      console.error(`${getCurrentTimestamp()} ❌ - streamBracketRetry - Response: ${errorText}`);
      throw new Error(`There was an error while sending the Agentforce message: ${response.statusText}`);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log(`${getCurrentTimestamp()} ✅ - streamBracketRetry - Stream complete!`);
          if ("flush" in res && typeof res.flush === "function") res.flush();
          res.end();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log(`${getCurrentTimestamp()} 📦 - streamBracketRetry - Chunk received`);

        res.write(chunk);
        if ("flush" in res && typeof res.flush === "function") res.flush();
      }
    } catch (streamError) {
      const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
      console.error(`${getCurrentTimestamp()} ❌ - streamBracketRetry - Stream error: ${errorMessage}`);
      res.end();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`${getCurrentTimestamp()} ❌ - streamBracketRetry - Error occurred: ${errorMessage}`);
    res.status(500).json({ message: errorMessage });
  }
};

export default streamBracketRetry;
