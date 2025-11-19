import React from 'react';
import type { ChatMessage } from '../../services/socket';

interface LiveChatTabProps {
  messages: ChatMessage[];
  messageInput: string;
  setMessageInput: (value: string) => void;
  handleSendMessage: () => void;
  socketId: string | null;
  chatBottomRef: React.RefObject<HTMLDivElement>;
}

const LiveChatTab: React.FC<LiveChatTabProps> = ({
  messages,
  messageInput,
  setMessageInput,
  handleSendMessage,
  socketId,
  chatBottomRef,
}) => {
  return (
    <>
      {/* Live Chat */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {messages.map((msg, idx) => {
            const isOwn = msg.sid === socketId;
            return (
              <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isOwn ? 'bg-blue-500 text-white' : 'bg-[#f3f2ef] text-[#2f3437]'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
                    <span className="font-medium">
                      {isOwn ? 'You' : msg.sid?.slice(0, 6)}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>
      </div>
      <div className="border-t border-[#e6e6e6] p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-[#e3e2e0] bg-slate-100 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          <button
            onClick={handleSendMessage}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};

export default LiveChatTab;
