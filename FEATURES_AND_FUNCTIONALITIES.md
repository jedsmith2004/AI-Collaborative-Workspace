# AI Colab Workspace - Current Features & Functionalities

## Project Overview
AI Colab Workspace is a real-time collaborative note-taking and workspace management application with integrated AI-powered assistance. It enables teams to work together on shared notes while leveraging AI to search, summarize, and assist with workspace content.

---

## Core Features

### 1. **Workspace Management**
- **Multiple Workspaces**: Users can create and manage multiple independent workspaces
- **Workspace Metadata**: Each workspace contains:
  - Name (required)
  - Description (optional)
  - Owner information
  - Timestamps (created_at, updated_at)
- **Workspace Listing**: View all available workspaces with quick navigation
- **Workspace Navigation**: Direct access to individual workspaces via URL parameters

### 2. **Collaborative Note Editing**

#### Real-Time Collaboration Features:
- **Live Note Synchronization**: Multiple users can edit notes simultaneously with instant updates propagated via WebSocket
- **Debounced Saving**: Changes are debounced (1-second delay) before being saved to the database to reduce database load
- **Note Updates**: Real-time notification of note content and title changes across all connected users
- **Note Management**:
  - Create new notes within a workspace
  - Edit note title and content
  - Automatic timestamps (created_at, updated_at)
  - Notes are associated with workspaces and authors

#### Remote Cursor Tracking:
- **Live Cursor Position Updates**: See where other users are typing in real-time
- **Cursor Visualization**: 
  - Color-coded cursors for each user (deterministic colors based on user session ID)
  - Cursor position calculated from caret coordinates in textarea
  - Updates only for notes currently being viewed
- **Cursor Lifecycle**: Cursors are removed when users disconnect

#### Document Architecture:
- **Note Structure**:
  - ID (primary key)
  - Title
  - Content
  - Workspace association
  - Author/User association
  - Timestamps
- **Note List Sidebar**: Quick access to all notes in current workspace with selection UI

### 3. **Live Chat System**

#### Real-Time Messaging:
- **Workspace Chat**: Live messaging system specific to each workspace
- **Message Broadcasting**: All connected users in a workspace receive messages in real-time via Socket.IO
- **Message History**: Conversation history maintained during active session
- **User Identification**: Messages tagged with sender's Socket ID for identification
- **Message Input UI**: Dedicated chat input with send functionality

#### Chat Features:
- Timestamp tracking for messages
- Clean message display with user identification
- Auto-scroll to latest messages
- Real-time notification of new messages

### 4. **AI Assistant with RAG (Retrieval-Augmented Generation)**

#### AI Chat Interface:
- **Conversational AI**: Separate from live chat, powered by OpenAI GPT models
- **Context Awareness**: AI maintains conversation history for context across multiple turns
- **Workspace Integration**: AI has access to the current workspace for retrieval

#### Retrieval-Augmented Generation (RAG) System:
- **Semantic Search**: 
  - Uses `sentence-transformers` (all-MiniLM-L6-v2) for embedding generation
  - Converts user queries and workspace notes into numerical embeddings
  - Calculates cosine similarity to find relevant documents

- **Document Relevance Filtering**:
  - Top-3 most relevant notes retrieved per query
  - Similarity threshold: Only includes documents with similarity > 0.15
  - Prevents irrelevant document inclusion

- **Context Building**:
  - Automatically builds system context from retrieved notes
  - Includes note title, content (up to 500 chars), and relevance score
  - Documents truncated if longer than 500 characters

#### AI Response Features:
- **Citation Extraction**: 
  - AI responses can cite specific documents using `[Doc: "title"]` format
  - Citations are parsed and linked to note IDs
  - Users can click citations to navigate directly to source notes

- **Source Display**: 
  - Retrieved documents shown to user with similarity scores
  - Clickable source documents that navigate to the note

- **Token Usage Tracking**: 
  - Prompt tokens, completion tokens, and total tokens are tracked
  - Helps with monitoring AI costs and usage

- **Conversation History**: 
  - Full conversation maintained in UI
  - Each message stored with role (user/assistant) and content
  - Citations preserved per message

#### AI Triggering:
- **Optional RAG**: Toggle for using workspace documents in AI responses
- **Fallback Behavior**: AI can answer general knowledge questions without RAG context
- **Graceful Degradation**: If no relevant documents found, AI uses general knowledge

---

## Technical Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **UI Framework**: Tailwind CSS for styling
- **Routing**: React Router for page navigation
- **Real-Time Communication**: Socket.IO client for WebSocket connections
- **HTTP Client**: Axios for REST API calls
- **Build Tool**: Vite for fast development and optimized builds

### Backend Stack
- **Framework**: FastAPI (Python)
- **Real-Time**: Socket.IO with async support (python-socketio)
- **Database**: SQLAlchemy ORM with SQLite (based on file structure)
- **AI/ML**: 
  - OpenAI API for conversational AI
  - Sentence Transformers for embeddings
  - NumPy for vector operations
- **Cache/Messaging**: Redis for real-time data management
- **API Communication**: CORS enabled for cross-origin requests

### Data Models
```
User
├── id
├── name
├── email
└── created_at

Workspace
├── id
├── name
├── description
├── owner_id (FK to User)
├── created_at
└── updated_at

Note
├── id
├── title
├── content
├── workspace_id (FK to Workspace)
├── author_id (FK to User)
├── created_at
└── updated_at
```

---

## User Interface Components

### Pages
- **Workspaces Page**: List of all workspaces with creation form
- **Collaborative Notes Page**: Main editor with chat, sidebar, and workspace content

### Components
- **WorkspaceSidebar**: Note list, workspace details
- **WorkspaceHeader**: Current workspace/note title and metadata
- **NoteEditor**: Textarea-based note content editor with cursor tracking
- **ChatPanel**: Tabbed interface with Live Chat and AI Assistant
  - **LiveChatTab**: Real-time messaging UI
  - **AIAssistantTab**: AI conversation with sources and citations
- **RemoteCursor**: Visual display of other users' cursor positions

---

## WebSocket Events & Communication

### Client-to-Server Events:
- `join_room`: Join workspace collaboration room
- `note_update`: Send note content/title changes
- `cursor_update`: Broadcast cursor position
- `send_message`: Send chat message
- `disconnect`: User disconnection

### Server-to-Client Events:
- `note_updated`: Broadcast note changes to workspace
- `message`: Receive new chat messages
- `user_disconnected`: Notification of user leaving
- `cursor_update`: Receive remote cursor positions

---

## Key Technical Details

### Real-Time Synchronization Strategy:
- **WebSocket Protocol**: Socket.IO for bi-directional, event-based communication
- **Room-Based Broadcasting**: Users grouped by workspace ID
- **Debounced Saves**: Changes held in memory for 1 second before database write
- **Optimistic Updates**: UI updates immediately, saved to DB asynchronously

### Performance Optimizations:
- **Debounced Saves**: Reduces database writes for frequent edits
- **Selective Cursor Updates**: Only updates visible note cursors
- **Lazy Document Retrieval**: RAG retrieves top-3 documents only
- **Embedding Caching**: Potential for caching embeddings (currently calculated per query)

### Security Considerations (Current State):
- **No Authentication**: Currently no user login/auth system
- **CORS Enabled**: All origins allowed (development setting)
- **Workspace Access**: No permission system (all workspaces accessible)
- **Note Access**: No per-note access controls

---

## Deployment & Environment
- **Server**: FastAPI application (Dockerfile available)
- **Deployment Platform**: Fly.io configuration available (fly.toml)
- **Environment Variables**: Supports `.env` file for API keys and configuration
- **Database**: SQLite with SQLAlchemy migrations on startup

---

## Current Limitations & Future Considerations
1. **No User Authentication**: All features work without login
2. **No Access Control**: No permissions or sharing system
3. **Single Author**: Notes don't properly track multiple authors for collaborative edits
4. **No Offline Support**: Requires active WebSocket connection
5. **Limited Message History**: Chat history not persisted to database
6. **Embedding Performance**: Embeddings recalculated for every query (not cached)
7. **No User Presence**: Besides cursors, no "who's online" indicator
