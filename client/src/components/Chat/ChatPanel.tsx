import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import LiveChatTab from './LiveChatTab';
import AIAssistantTab from './AIAssistantTab';
import type { ChatMessage } from '../../services/socket';

interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  activeTab: 'chat' | 'ai';
  setActiveTab: (tab: 'chat' | 'ai') => void;
  messages: ChatMessage[];
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSendMessage: () => void;
  socketId: string | null;
  chatBottomRef: React.RefObject<HTMLDivElement>;
  aiMessages: AiMessage[];
  aiInput: string;
  setAiInput: (value: string) => void;
  handleSendAiMessage: () => void;
  isAiLoading: boolean;
  onSourceClick: (noteId: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  activeTab,
  setActiveTab,
  messages,
  messageInput,
  setMessageInput,
  handleSendMessage,
  socketId,
  chatBottomRef,
  aiMessages,
  aiInput,
  setAiInput,
  handleSendAiMessage,
  isAiLoading,
  onSourceClick
}) => {
  return (
    <aside className="flex w-80 flex-col border-l border-gray-700 bg-gray-800">
      <div className="relative flex border-b border-gray-700 bg-gray-800/95 p-1">
        <div
          className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-gray-700 transition-transform duration-200 ease-out ${
            activeTab === 'chat' ? 'translate-x-1' : 'translate-x-[calc(100%+4px)]'
          }`}
        />
        <button
          onClick={() => setActiveTab('chat')}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 bg-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 outline-none rounded-lg ${
            activeTab === 'chat' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <MessageSquare size={14} />
          Live Chat
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`relative z-10 flex-1 flex items-center justify-center gap-2 bg-transparent px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 outline-none rounded-lg ${
            activeTab === 'ai' ? 'text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Sparkles size={14} />
          AI Assistant
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          className={`absolute inset-0 flex flex-col transition-all duration-200 ease-out ${
            activeTab === 'chat'
              ? 'translate-x-0 opacity-100'
              : '-translate-x-4 opacity-0 pointer-events-none'
          }`}
          aria-hidden={activeTab !== 'chat'}
        >
          <LiveChatTab
            messages={messages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            handleSendMessage={handleSendMessage}
            socketId={socketId}
            chatBottomRef={chatBottomRef}
          />
        </div>

        {/* AI Assistant */}
        <div
          className={`absolute inset-0 flex flex-col transition-all duration-200 ease-out ${
            activeTab === 'ai'
              ? 'translate-x-0 opacity-100'
              : 'translate-x-4 opacity-0 pointer-events-none'
          }`}
          aria-hidden={activeTab !== 'ai'}
        >
          <AIAssistantTab
            aiMessages={aiMessages}
            aiInput={aiInput}
            setAiInput={setAiInput}
            handleSendAiMessage={handleSendAiMessage}
            isAiLoading={isAiLoading}
            onSourceClick={onSourceClick}
          />
        </div>
      </div>
    </aside>
  );
};

export default ChatPanel;
