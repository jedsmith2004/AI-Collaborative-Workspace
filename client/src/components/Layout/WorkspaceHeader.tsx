import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, UserPlus, Menu, ChevronRight, Crown, Edit3, Eye } from 'lucide-react';
import type { Note } from '../../services/socket';
import type { Collaborator } from '../../api/auth';
import InviteCollaboratorModal from '../Collaborators/InviteCollaboratorModal';

interface WorkspaceHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  workspaceId: string;
  workspaceTitle: string;
  socketId: string | null;
  selectedNote: Note | null;
  collaborators: Collaborator[];
  isOwner: boolean;
  onCollaboratorsChange: () => void;
}

const PERMISSION_ICONS: Record<number, React.ReactNode> = {
  1: <Eye size={10} />,
  2: <Edit3 size={10} />,
  3: <Crown size={10} />,
};

const PERMISSION_LABELS: Record<number, string> = {
  1: 'Viewer',
  2: 'Editor',
  3: 'Owner',
};

const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  workspaceId,
  workspaceTitle,
  socketId,
  selectedNote,
  collaborators,
  isOwner,
  onCollaboratorsChange,
}) => {
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCollaboratorsList, setShowCollaboratorsList] = useState(false);

  // Filter to only accepted collaborators (including owner)
  const activeCollaborators = collaborators.filter(c => c.accepted_at || c.is_owner);
  
  // Show up to 5 avatars
  const displayedCollaborators = activeCollaborators.slice(0, 5);
  const extraCount = Math.max(0, activeCollaborators.length - 5);

  return (
    <>
      <header className="flex items-center justify-between border-b border-gray-700 bg-gray-800/95 px-4 py-3 backdrop-blur relative z-30">
        {/* Left side - Home link & workspace title */}
        <div className="flex items-center gap-4">
          {/* Home button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors group"
            title="Go to Dashboard"
          >
            <Home size={18} />
            <span className="text-sm font-medium hidden sm:inline">Home</span>
          </button>

          <ChevronRight size={16} className="text-gray-600" />

          {/* Sidebar toggle & workspace title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
              title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            >
              <Menu size={18} className="text-gray-400" />
            </button>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Workspace</p>
              <h1 className="text-base font-semibold text-white">{workspaceTitle}</h1>
            </div>
          </div>
        </div>

        {/* Right side - Collaborators, invite, status */}
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <span className="flex items-center gap-1.5 text-sm text-gray-400">
            <span className={`h-2 w-2 rounded-full ${socketId ? 'bg-emerald-500' : 'bg-gray-500'}`} />
            <span className="hidden sm:inline">{socketId ? 'Connected' : 'Offline'}</span>
          </span>

          {/* Collaborator avatars */}
          <div className="relative">
            <button
              onClick={() => setShowCollaboratorsList(!showCollaboratorsList)}
              className="flex items-center -space-x-2 hover:opacity-90 transition-opacity"
            >
              {displayedCollaborators.map((collab, index) => (
                <div
                  key={collab.user_id}
                  className="relative group"
                  style={{ zIndex: displayedCollaborators.length - index }}
                >
                  {collab.profile_picture_url ? (
                    <img
                      src={collab.profile_picture_url}
                      alt={collab.user_name}
                      className="w-8 h-8 rounded-full border-2 border-gray-800 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-800 bg-indigo-600 flex items-center justify-center text-white text-xs font-medium">
                      {collab.user_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {collab.is_owner && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border border-gray-800">
                      <Crown size={10} className="text-gray-900" />
                    </div>
                  )}
                </div>
              ))}
              {extraCount > 0 && (
                <div className="w-8 h-8 rounded-full border-2 border-gray-800 bg-gray-600 flex items-center justify-center text-white text-xs font-medium">
                  +{extraCount}
                </div>
              )}
            </button>

            {/* Collaborators dropdown */}
            {showCollaboratorsList && (
              <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-700">
                  <h3 className="font-semibold text-white text-sm">Collaborators</h3>
                  <p className="text-xs text-gray-500">{activeCollaborators.length} members</p>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-700/50">
                  {activeCollaborators.map((collab) => (
                    <div key={collab.user_id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/30">
                      {collab.profile_picture_url ? (
                        <img
                          src={collab.profile_picture_url}
                          alt={collab.user_name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                          {collab.user_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{collab.user_name}</p>
                        <p className="text-xs text-gray-500 truncate">{collab.user_email}</p>
                      </div>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        collab.is_owner 
                          ? 'bg-yellow-500/20 text-yellow-400' 
                          : collab.permission_level === 2 
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-gray-700 text-gray-400'
                      }`}>
                        {PERMISSION_ICONS[collab.permission_level]}
                        {PERMISSION_LABELS[collab.permission_level]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Invite button - only show for owner */}
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Invite</span>
            </button>
          )}
        </div>
      </header>

      {/* Invite Modal */}
      <InviteCollaboratorModal
        workspaceId={workspaceId}
        workspaceName={workspaceTitle}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInviteSent={onCollaboratorsChange}
      />

      {/* Click outside to close dropdown */}
      {showCollaboratorsList && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowCollaboratorsList(false)}
        />
      )}
    </>
  );
};

export default WorkspaceHeader;
