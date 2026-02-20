import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

      <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-300 leading-relaxed">
        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : content ? (
          <>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-base font-bold text-white mt-4 mb-2 first:mt-0">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-sm font-bold text-white mt-3 mb-1.5 first:mt-0">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-gray-200 mt-3 mb-1 first:mt-0">{children}</h3>
                ),
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5 pl-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5 pl-2">{children}</ol>,
                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                em: ({ children }) => <em className="italic text-gray-200">{children}</em>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  return isBlock ? (
                    <code className="block bg-gray-800 rounded-lg p-3 my-2 text-xs font-mono text-green-300 whitespace-pre-wrap overflow-x-auto">
                      {children}
                    </code>
                  ) : (
                    <code className="bg-gray-800 rounded px-1 py-0.5 text-xs font-mono text-orange-300">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <pre className="mb-2">{children}</pre>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-orange-500 pl-3 my-2 text-gray-400 italic">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="border-gray-700 my-3" />,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-orange-400 hover:text-orange-300 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
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
