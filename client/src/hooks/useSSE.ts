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
          options.onDone?.(contentRef.current);
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
              options.onDone?.(contentRef.current);
              return;
            }

            try {
              const parsed = JSON.parse(data) as { type?: string; content?: string; text?: string };
              const chunk = parsed.content ?? parsed.text ?? data;
              contentRef.current += chunk;
              options.onChunk?.(chunk);
              setState((prev) => ({ ...prev, content: contentRef.current }));
            } catch {
              // Raw text chunk
              contentRef.current += data;
              options.onChunk?.(data);
              setState((prev) => ({ ...prev, content: contentRef.current }));
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Stream error";
      options.onError?.(msg);
      setState((prev) => ({ ...prev, isStreaming: false, error: msg }));
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { ...state, stream, reset };
};
