import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { Citation } from '../../api/ai';

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: unknown[];
  citations?: Citation[];
}

interface AIAssistantTabProps {
  aiMessages: AiMessage[];
  aiInput: string;
  setAiInput: (value: string) => void;
  handleSendAiMessage: () => void;
  isAiLoading: boolean;
  onSourceClick: (noteId: number) => void;
}

type CitationMap = Map<string, Citation>;

function buildMarkdownComponents(
  citationMap?: CitationMap,
  onCitationClick?: (noteId: number) => void
): Components {
  const withCitations = Boolean(citationMap && onCitationClick);

  const maybeRenderCitations = (children: React.ReactNode) =>
    withCitations && citationMap && onCitationClick
      ? applyCitationComponents(children, citationMap, onCitationClick)
      : children;

  return {
    p: ({ children }) => (
      <p className="mb-2 last:mb-0">
        {maybeRenderCitations(children)}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-purple-700">
        {maybeRenderCitations(children)}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic">
        {maybeRenderCitations(children)}
      </em>
    ),
    code: ({ children }) => (
      <code className="rounded bg-gray-200 px-1 py-0.5 text-xs font-mono text-gray-800">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="my-2 rounded bg-gray-800 p-2 text-white overflow-x-auto text-xs">
        {children}
      </pre>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside my-1 space-y-0.5">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside my-1 space-y-0.5">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="ml-2 text-sm">
        {maybeRenderCitations(children)}
      </li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-purple-400 pl-3 italic my-2 text-gray-700">
        {children}
      </blockquote>
    ),
    h1: ({ children }) => (
      <h1 className="text-base font-bold mb-1 mt-2">
        {maybeRenderCitations(children)}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-sm font-bold mb-1 mt-2">
        {maybeRenderCitations(children)}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-semibold mb-1 mt-1">
        {maybeRenderCitations(children)}
      </h3>
    ),
  };
}

function renderMessageWithCitations(
  content: string,
  citations: Citation[] | undefined,
  onCitationClick: (noteId: number) => void
) {
  const baseClass =
    'text-sm prose prose-sm max-w-none prose-p:my-1 prose-p:leading-relaxed prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0';

  if (!citations || citations.length === 0) {
    return (
      <div className={baseClass}>
        <ReactMarkdown components={buildMarkdownComponents()}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  let processed = content;
  let offset = 0;
  const citationMap: CitationMap = new Map();

  citations.forEach((citation, index) => {
    const placeholder = `[CITE:${index}]`;
    citationMap.set(placeholder, citation);

    const pos = citation.position + offset;
    processed =
      processed.slice(0, pos) +
      placeholder +
      processed.slice(pos + citation.match_text.length);

    offset += placeholder.length - citation.match_text.length;
  });

  return (
    <div className={baseClass}>
      <ReactMarkdown components={buildMarkdownComponents(citationMap, onCitationClick)}>
        {processed}
      </ReactMarkdown>
    </div>
  );
}

function applyCitationComponents(
  children: React.ReactNode,
  citationMap: CitationMap,
  onCitationClick: (noteId: number) => void
): React.ReactNode {
  if (typeof children === 'string') {
    const parts = children.split(/(\[CITE:\d+\])/);

    return parts.map((segment, index) => {
      const match = segment.match(/\[CITE:(\d+)\]/);
      if (match) {
        const citation = citationMap.get(segment);
        if (!citation) return null;

        return (
          <button
            key={`cite-${index}`}
            onClick={() => onCitationClick(citation.note_id)}
            className="inline-flex items-center rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700 hover:bg-purple-200 transition-colors mx-0.5"
            title={`Jump to: ${citation.title}`}
          >
            {citation.title}
          </button>
        );
      }
      return segment;
    });
  }

  if (Array.isArray(children)) {
    return children.map((child, index) =>
      typeof child === 'string'
        ? applyCitationComponents(child, citationMap, onCitationClick)
        : // keep React elements as-is
          <React.Fragment key={index}>{child}</React.Fragment>
    );
  }

  return children;
}

const AIAssistantTab: React.FC<AIAssistantTabProps> = ({
  aiMessages,
  aiInput,
  setAiInput,
  handleSendAiMessage,
  isAiLoading,
  onSourceClick,
}) => {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {aiMessages.map((msg, index) => {
            const isUser = msg.role === 'user';

            return (
              <div key={index}>
                <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isUser ? 'bg-purple-500 text-white' : 'bg-[#f3f2ef] text-[#2f3437]'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    ) : (
                      renderMessageWithCitations(msg.content, msg.citations, onSourceClick)
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isAiLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-[#f3f2ef] px-3 py-2 text-sm text-[#2f3437]">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#e6e6e6] p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendAiMessage()}
            placeholder="Ask AI anything..."
            disabled={isAiLoading}
            className="flex-1 rounded-lg border border-[#e3e2e0] px-3 py-2 text-sm outline-none bg-slate-100 focus:border-purple-400 disabled:opacity-50"
          />
          <button
            onClick={handleSendAiMessage}
            disabled={isAiLoading}
            className="rounded-lg bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default AIAssistantTab;