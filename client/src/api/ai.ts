import axios from 'axios';

const API_URL = 'http://localhost:8000';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  message: string;
  workspace_id: number;
  conversation_history: ChatMessage[];
}

interface ChatResponse {
  message: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function sendAIMessage(request: ChatRequest): Promise<ChatResponse> {
  const response = await axios.post<ChatResponse>(`${API_URL}/ai/chat`, request);
  return response.data;
}