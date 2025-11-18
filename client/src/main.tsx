import React from "react";
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NotesPage from "./pages/NotesPage";
import CollaborativeNotesPage from "./pages/CollaborativeNotesPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorkspacesPage />} />
        <Route path="/workspaces/:workspaceId" element={<CollaborativeNotesPage />} />
        <Route path="/old-notes" element={<NotesPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
