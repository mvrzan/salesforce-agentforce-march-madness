import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import BracketTree from "../components/BracketTree";
import ReasoningPanel from "../components/ReasoningPanel";
import { useBracket } from "../context/BracketContext";
import { useSSE } from "../hooks/useSSE";
import { startAgentSession, deleteAgentSession, sendStreamingMessage } from "../services/api";
import { getBracketStructure } from "../services/api";
import { type Bracket, type Region } from "../types/tournament";

const REGIONS: Region[] = ["East", "West", "South", "Midwest"];
const PICK_PATTERN = /PICK:\s*(\S+)\s*->\s*(\S+)/g;

const buildBracketPrompt = (bracket: Bracket): string => {
  const r64 = bracket.rounds.find((r) => r.round === "Round of 64");
  if (!r64) return "";

  const matchupLines = REGIONS.flatMap((region) => {
    const matchups = r64.matchups.filter((m) => m.region === region);
    return [
      `\n${region} Region:`,
      ...matchups.map(
        (m) =>
          `  MATCHUP_ID: ${m.id} | (${m.topTeam?.seed ?? "?"}) ${m.topTeam?.name ?? "TBD"} [TEAM_ID: ${m.topTeam?.id ?? "?"}] vs (${m.bottomTeam?.seed ?? "?"}) ${m.bottomTeam?.name ?? "TBD"} [TEAM_ID: ${m.bottomTeam?.id ?? "?"}]`,
      ),
    ];
  });

  return `You are analyzing the 2025 NCAA Men's Basketball Tournament bracket.
Based on team seeds, historical performance, key players, coaching strength, and statistical matchups,
predict the winner of every Round of 64 matchup.

Here is the bracket with the exact IDs you MUST use:
${matchupLines.join("\n")}

For EVERY matchup above, respond in this exact format:
PICK: [MATCHUP_ID] -> [WINNER_TEAM_ID]
REASON: [Brief 1-2 sentence explanation]

Use ONLY the exact MATCHUP_ID and TEAM_ID values listed above. Cover all 32 matchups.`;
};

const AIBracketPage = () => {
  const { state, dispatch } = useBracket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sequenceRef = useRef(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "starting" | "active" | "error">("idle");

  // Track accumulated text and already-dispatched picks to avoid duplicates mid-stream
  const aiTextRef = useRef("");
  const dispatchedPicksRef = useRef<Set<string>>(new Set());

  const { content, isStreaming, error, stream, reset } = useSSE({
    onChunk: (chunk) => {
      aiTextRef.current += chunk;
      const matches = [...aiTextRef.current.matchAll(PICK_PATTERN)];
      for (const match of matches) {
        const matchupId = match[1];
        const winnerId = match[2];
        if (!dispatchedPicksRef.current.has(matchupId)) {
          dispatchedPicksRef.current.add(matchupId);
          dispatch({ type: "ADD_AI_PICK", payload: { matchupId, winnerId } });
        }
      }
    },
    onDone: () => {
      setIsGenerating(false);
      setHasGenerated(true);
    },
    onError: () => {
      setIsGenerating(false);
      setSessionStatus("error");
    },
  });

  // Load bracket structure if needed
  useEffect(() => {
    if (state.realBracket) return;
    const load = async () => {
      try {
        const res = await getBracketStructure();
        if (res.success) dispatch({ type: "SET_REAL_BRACKET", payload: res.data });
      } catch (err) {
        console.error(err);
      }
    };
    void load();
  }, [dispatch, state.realBracket]);

  const initSession = async (): Promise<string> => {
    const externalSessionId = uuidv4();
    setSessionStatus("starting");
    const res = await startAgentSession(externalSessionId);
    setSessionId(res.sessionId);
    dispatch({ type: "SET_AI_SESSION_ID", payload: res.sessionId });
    setSessionStatus("active");
    return res.sessionId;
  };

  const handleGenerate = async () => {
    reset();
    dispatch({ type: "RESET_AI_BRACKET" });
    aiTextRef.current = "";
    dispatchedPicksRef.current.clear();
    setIsGenerating(true);

    try {
      const agentSessionId = sessionId ?? (await initSession());
      const seqId = sequenceRef.current++;
      const prompt = state.realBracket ? buildBracketPrompt(state.realBracket) : "";

      const fetchPromise = sendStreamingMessage(agentSessionId, prompt, seqId);
      await stream(fetchPromise);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start AI session";
      dispatch({ type: "SET_ERROR", payload: msg });
      setIsGenerating(false);
      setSessionStatus("error");
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      await deleteAgentSession(sessionId);
      setSessionId(null);
      setSessionStatus("idle");
      setHasGenerated(false);
      reset();
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-12">
      {/* Header */}
      <div className="max-w-screen-2xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">🤖 AI Bracket</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Powered by Salesforce Agentforce · {sessionStatus === "active" ? "Session active" : "No session"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {sessionId && (
            <button
              onClick={handleEndSession}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              End Session
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isStreaming}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm"
          >
            {isGenerating || isStreaming ? "Generating..." : hasGenerated ? "Regenerate" : "Generate AI Bracket"}
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="max-w-screen-2xl mx-auto px-4 flex gap-4" style={{ minHeight: "calc(100vh - 140px)" }}>
        {/* Bracket – 65% */}
        <div className="flex-1 overflow-auto">
          <BracketTree
            bracket={state.aiBracket ?? state.realBracket}
            realBracket={state.realBracket}
            isReadOnly
            label="AI Picks"
          />
          {!hasGenerated && !isGenerating && (
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
              Click "Generate AI Bracket" to let Agentforce analyze the field
            </div>
          )}
        </div>

        {/* Reasoning panel – 35% */}
        <div
          className="w-80 xl:w-96 shrink-0 flex flex-col"
          style={{ height: "calc(100vh - 140px)", position: "sticky", top: "56px" }}
        >
          <ReasoningPanel content={content} isStreaming={isStreaming} error={error} title="Agentforce Reasoning" />
        </div>
      </div>
    </div>
  );
};

export default AIBracketPage;
