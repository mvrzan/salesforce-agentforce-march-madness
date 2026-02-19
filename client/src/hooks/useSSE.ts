import { useState, useEffect, useRef, useCallback } from "react";

interface SSEState {
  content: string;
  isStreaming: boolean;
  isDone: boolean;
  error: string | null;
}

interface UseSSEOptions {
  onChunk?: (chunk: string) => void;
  onDone?: (fullContent: string) => void;
  onError?: (error: string) => void;
}

export const useSSE = (options: UseSSEOptions = {}) => {
  const [state, setState] = useState<SSEState>({
    content: "",
    isStreaming: false,
    isDone: false,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef("");
  // Keep a stable ref to the latest options so useCallback deps stay empty
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const reset = useCallback(() => {
    contentRef.current = "";
    setState({ content: "", isStreaming: false, isDone: false, error: null });
  }, []);

  const stream = useCallback(async (fetchPromise: Promise<Response>) => {
    // Cancel any previous stream
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    contentRef.current = "";
    setState({ content: "", isStreaming: true, isDone: false, error: null });

    try {
      const response = await fetchPromise;

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          setState((prev) => ({ ...prev, isStreaming: false, isDone: true }));
          optionsRef.current.onDone?.(contentRef.current);
          break;
        }

        const text = decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              setState((prev) => ({ ...prev, isStreaming: false, isDone: true }));
              optionsRef.current.onDone?.(contentRef.current);
              return;
            }

            try {
              const parsed = JSON.parse(data) as {
                type?: string;
                content?: string;
                text?: string;
                value?: string;
                delta?: string | { text?: string };
                message?: {
                  type?: string;
                  message?: string;
                  id?: string;
                  content?: { type?: string; staticContent?: { format?: string; text?: string } }[];
                };
                data?: { type?: string; text?: string; message?: string; value?: string };
                messages?: { type?: string; text?: string; message?: string }[];
              };

              const chunk =
                // Agentforce: { message: { type: "TextChunk", message: "..." } }
                parsed.message?.message ??
                // Agentforce: { message: { content: [{ staticContent: { text } }] } }
                parsed.message?.content?.[0]?.staticContent?.text ??
                // Generic / fallback shapes
                parsed.content ??
                parsed.text ??
                parsed.value ??
                (typeof parsed.delta === "string" ? parsed.delta : parsed.delta?.text) ??
                parsed.data?.text ??
                parsed.data?.message ??
                parsed.data?.value ??
                parsed.messages?.[0]?.text ??
                parsed.messages?.[0]?.message ??
                null;

              // Skip chunks with no extractable text (e.g. metadata/control events)
              if (chunk === null) continue;

              contentRef.current += chunk;
              optionsRef.current.onChunk?.(chunk);
              setState((prev) => ({ ...prev, content: contentRef.current }));
            } catch {
              // Raw text chunk
              contentRef.current += data;
              optionsRef.current.onChunk?.(data);
              setState((prev) => ({ ...prev, content: contentRef.current }));
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Stream error";
      optionsRef.current.onError?.(msg);
      setState((prev) => ({ ...prev, isStreaming: false, error: msg }));
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { ...state, stream, reset };
};
