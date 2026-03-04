import { type Request, type Response } from "express";
import { getCurrentTimestamp } from "../utils/loggingUtil.ts";
import salesforceSdk from "@heroku/applink";

// Prompt text lives here on the server so it is never exposed in the client bundle.
// The client sends only a roundIndex (0-based) to select the appropriate prompt.
const ROUND_PROMPTS: string[] = [
  "Provide your picks for all 8 Round of 64 matchups in the East region.",
  "Provide your picks for all 8 Round of 64 matchups in the West region.",
  "Provide your picks for all 8 Round of 64 matchups in the South region.",
  "Provide your picks for all 8 Round of 64 matchups in the Midwest region.",
  "Now provide your picks for every Round of 32 matchup across all 4 regions, based on your Round of 64 picks.",
  "Now provide your picks for every Sweet 16 matchup across all 4 regions.",
  "Now provide your picks for every Elite 8 matchup across all 4 regions.",
  "Finally, provide your picks for the Final Four (FF-1, FF-2) and Championship (CHAMP-1).",
];

const streamBracketRound = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, roundIndex, sequenceId } = req.body as {
      sessionId: string;
      roundIndex: number;
      sequenceId: number;
    };

    if (typeof roundIndex !== "number" || roundIndex < 0 || roundIndex >= ROUND_PROMPTS.length) {
      res.status(400).json({ message: `Invalid roundIndex: must be 0–${ROUND_PROMPTS.length - 1}` });
      return;
    }

    const message = ROUND_PROMPTS[roundIndex];

    console.log(
      `${getCurrentTimestamp()} 🎯 - streamBracketRound - Round ${roundIndex}, Session: ${sessionId}, Sequence: ${sequenceId}`,
    );

    const connectionName = process.env.APP_LINK_CONNECTION_NAME;
    if (!connectionName) throw new Error("APP_LINK_CONNECTION_NAME environment variable is not set");

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

    console.log(`${getCurrentTimestamp()} 🤖 - streamBracketRound - Sending Agentforce message...`);

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
        `${getCurrentTimestamp()} ❌ - streamBracketRound - API Error: ${response.status} ${response.statusText}`,
      );
      console.error(`${getCurrentTimestamp()} ❌ - streamBracketRound - Response: ${errorText}`);
      throw new Error(`There was an error while sending the Agentforce message: ${response.statusText}`);
    }

    if (!response.body) throw new Error("Response body is null");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`${getCurrentTimestamp()} ✅ - streamBracketRound - Round ${roundIndex} complete`);
          if ("flush" in res && typeof res.flush === "function") res.flush();
          res.end();
          break;
        }
        res.write(decoder.decode(value, { stream: true }));
        if ("flush" in res && typeof res.flush === "function") res.flush();
      }
    } catch (streamError) {
      const msg = streamError instanceof Error ? streamError.message : String(streamError);
      console.error(`${getCurrentTimestamp()} ❌ - streamBracketRound - Stream error: ${msg}`);
      res.end();
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${getCurrentTimestamp()} ❌ - streamBracketRound - Error: ${msg}`);
    res.status(500).json({ message: msg });
  }
};

export default streamBracketRound;
