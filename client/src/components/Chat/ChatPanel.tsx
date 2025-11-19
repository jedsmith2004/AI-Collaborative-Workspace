import React from 'react';
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
  onSourceClick: (noteId: number) => void;
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
    <aside className="flex w-80 flex-col border-l border-[#e6e6e6] bg-white/95 backdrop-blur-sm">
      <div className="relative flex border-b border-[#e6e6e6] bg-[#f7f7f5]">
        <div
          className={`absolute inset-y-1 w-[50%] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
            activeTab === 'chat' ? 'translate-x-1' : 'translate-x-[100%]'
          }`}
        />
        <button
          onClick={() => setActiveTab('chat')}
          className={`relative z-10 flex-1 bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 outline-none focus:outline-none focus-visible:outline-none active:outline-none hover:outline-none border-none focus:ring-0 ${
            activeTab === 'chat' ? 'text-[#111827]' : 'text-[#9b9a97]'
          }`}
        >
          Live Chat
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`relative z-10 flex-1 bg-transparent px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 outline-none focus:outline-none focus-visible:outline-none active:outline-none hover:outline-none border-none focus:ring-0 ${
            activeTab === 'ai' ? 'text-[#111827]' : 'text-[#9b9a97]'
          }`}
        >
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
