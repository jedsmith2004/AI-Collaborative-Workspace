import React from "react";
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import CollaborativeNotesPage from "./pages/CollaborativeNotesPage";
import WorkspacesPage from "./pages/WorkspacesPage";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import CallbackPage from "./pages/CallbackPage";
import './index.css'

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN || '';
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID || '';
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE || '';

// Check if Auth0 is configured
const isAuth0Configured = auth0Domain && auth0ClientId;

if (!isAuth0Configured) {
  console.warn('Auth0 is not configured. Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in your .env file.');
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/callback" element={<CallbackPage />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/workspaces" element={
          <ProtectedRoute>
            <WorkspacesPage />
          </ProtectedRoute>
        } />
        <Route path="/workspaces/:workspaceId" element={
          <ProtectedRoute>
            <CollaborativeNotesPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAuth0Configured ? (
      <Auth0Provider
        domain={auth0Domain}
        clientId={auth0ClientId}
        authorizationParams={{
          redirect_uri: `${window.location.origin}/callback`,
          ...(auth0Audience && { audience: auth0Audience }),
        }}
        cacheLocation="localstorage"
      >
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Auth0Provider>
    ) : (
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    )}
  </React.StrictMode>
);
