import { useEffect, useRef } from "react";

interface ReasoningPanelProps {
  content: string;
  isStreaming: boolean;
  error?: string | null;
  title?: string;
}

const ReasoningPanel = ({ content, isStreaming, error, title = "AI Reasoning" }: ReasoningPanelProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [content, isStreaming]);

  return (
    <div className="flex flex-col h-full bg-gray-900/60 border border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 bg-gray-800/50">
        <span className="text-orange-400 text-sm">🤖</span>
        <span className="text-sm font-semibold text-gray-200">{title}</span>
        {isStreaming && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-xs text-orange-400">Thinking...</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap wrap-break-word">
        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : content ? (
          <>
            {content}
            {isStreaming && <span className="inline-block w-2 h-4 bg-orange-400 ml-0.5 animate-pulse align-middle" />}
          </>
        ) : (
          <div className="text-gray-600 italic">
            {isStreaming ? "Starting response..." : "AI reasoning will appear here once you generate a bracket."}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ReasoningPanel;
