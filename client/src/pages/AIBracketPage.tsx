import { useEffect, useRef, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import BracketTree from "../components/BracketTree";
import ReasoningPanel from "../components/ReasoningPanel";
import { useBracket } from "../context/BracketContext";
import { useSSE } from "../hooks/useSSE";
import { startAgentSession, deleteAgentSession, sendStreamingMessage } from "../services/api";
import { getBracketStructure } from "../services/api";

const PICK_PATTERN = /(?:PICK|UPSET\s+ALERT):\s*(\S+)\s*->\s*(\S+)/gi;
const REASONING_STORAGE_KEY = "agentforce_reasoning";

// Sequential prompts — sent one at a time so the agent doesn't stall and ask for confirmation.
// Each prompt is scoped to a single round so the response stays focused and parseable.
// Format instructions belong in the Agentforce system prompt / topic config, not here.
const ROUND_PROMPTS = [
  `I need you to provide your picks for every Round of 64 matchup across all 4 regions.`,

  `Now provide your picks for every Round of 32 matchup across all 4 regions, based on your Round of 64 picks.`,

  `Now provide your picks for every Sweet 16 matchup across all 4 regions.`,

  `Now provide your picks for every Elite 8 matchup across all 4 regions.`,

  `Finally, provide your picks for the Final Four (FF-1, FF-2) and Championship (CHAMP-1).`,
];

const AIBracketPage = () => {
  const { state, dispatch } = useBracket();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sequenceRef = useRef(1);
  const [isGenerating, setIsGenerating] = useState(false);
  // Restore hasGenerated from persisted AI picks so the bracket shows after a refresh
  const [hasGenerated, setHasGenerated] = useState(() => state.aiPicks.length > 0);
  const [sessionStatus, setSessionStatus] = useState<"idle" | "starting" | "active" | "error">("idle");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  // Accumulated reasoning content across all rounds — persisted to localStorage so it
  // survives page refreshes and navigation.
  const [allContent, setAllContent] = useState<string>(() => localStorage.getItem(REASONING_STORAGE_KEY) ?? "");

  // Track accumulated text and already-dispatched picks to avoid duplicates mid-stream
  const aiTextRef = useRef("");
  const dispatchedPicksRef = useRef<Set<string>>(new Set());

  const { isStreaming, error, stream, reset } = useSSE({
    onChunk: (chunk) => {
      aiTextRef.current += chunk;
      // Keep accumulated display content in sync (never wiped between rounds)
      setAllContent((prev) => {
        const next = prev + chunk;
        localStorage.setItem(REASONING_STORAGE_KEY, next);
        return next;
      });
      const matches = [...aiTextRef.current.matchAll(PICK_PATTERN)];
      for (const match of matches) {
        // Strip all markdown artifacts the agent may wrap around values (* ` [ ])
        const matchupId = match[1].replace(/[*`[\]]/g, "").toLowerCase();
        const winnerId = match[2].replace(/[*`[\]]/g, "");
        if (!dispatchedPicksRef.current.has(matchupId)) {
          dispatchedPicksRef.current.add(matchupId);
          dispatch({ type: "ADD_AI_PICK", payload: { matchupId, winnerId } });
        }
      }
    },
    onDone: () => {
      // State is managed by handleGenerate after all rounds complete
    },
    onError: () => {
      setIsGenerating(false);
      setSessionStatus("error");
    },
  });

  // Automatically clean up the Agentforce session when the user navigates away
  useEffect(() => {
    return () => {
      if (sessionId) {
        void deleteAgentSession(sessionId).catch(console.error);
      }
    };
    // sessionId is captured via closure at unmount time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setAllContent("");
    localStorage.removeItem(REASONING_STORAGE_KEY);
    setIsGenerating(true);
    setHasGenerated(false);

    try {
      const agentSessionId = sessionId ?? (await initSession());

      // Auto-open the reasoning panel when generation starts
      setIsPanelOpen(true);

      // Send one prompt per round sequentially so the agent never stalls
      for (const prompt of ROUND_PROMPTS) {
        const fetchPromise = sendStreamingMessage(agentSessionId, prompt, sequenceRef.current++);
        await stream(fetchPromise);
      }

      setIsGenerating(false);
      setHasGenerated(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start AI session";
      dispatch({ type: "SET_ERROR", payload: msg });
      setIsGenerating(false);
      setSessionStatus("error");
    }
  };

  const sessionIdRef = useRef<string | null>(null);

  // Keep ref in sync so the unmount cleanup always sees the latest session ID
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Automatically clean up the Agentforce session when the user navigates away
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        void deleteAgentSession(sessionIdRef.current).catch(console.error);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-12">
      {/* Header */}
      <div className="max-w-screen-2xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Bot size={22} className="text-orange-400" /> AI Bracket
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Powered by Salesforce Agentforce · {sessionStatus === "active" ? "Session active" : "No session"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(hasGenerated || isStreaming) && (
            <button
              onClick={() => setIsPanelOpen((o) => !o)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors text-sm flex items-center gap-2"
            >
              <Bot size={14} />
              {isPanelOpen ? "Hide Reasoning" : "Show Reasoning"}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isStreaming}
            className="px-5 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-2"
          >
            {(isGenerating || isStreaming) && <RefreshCw size={14} className="animate-spin" />}
            {isGenerating || isStreaming ? "Generating..." : hasGenerated ? "Regenerate" : "Generate AI Bracket"}
          </button>
        </div>
      </div>

      {/* Bracket – full width */}
      <div className="max-w-screen-2xl mx-auto px-4">
        {hasGenerated || isGenerating ? (
          state.aiBracket ? (
            <BracketTree bracket={state.aiBracket} realBracket={state.realBracket} isReadOnly label="AI Picks" />
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              <div className="text-center">
                <Bot size={36} className="mx-auto mb-3 text-orange-400 animate-bounce" />
                <div>Agentforce is analyzing the bracket...</div>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
            Click &quot;Generate AI Bracket&quot; to let Agentforce analyze the field
          </div>
        )}
      </div>

      {/* Reasoning panel – fixed right overlay, never squeezes the bracket */}
      {isPanelOpen && (
        <div className="fixed right-0 top-14 bottom-0 w-96 z-40 flex flex-col shadow-2xl">
          <ReasoningPanel content={allContent} isStreaming={isStreaming} error={error} title="Agentforce Reasoning" />
        </div>
      )}
    </div>
  );
};

export default AIBracketPage;
