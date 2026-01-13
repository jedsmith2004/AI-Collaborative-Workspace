import React from 'react';
import { Send } from 'lucide-react';
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
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.sid === socketId;
              return (
                <div key={idx} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      isOwn ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-100'
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
            })
          )}
          <div ref={chatBottomRef} />
        </div>
      </div>
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSendMessage}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-white transition"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
};

export default LiveChatTab;
