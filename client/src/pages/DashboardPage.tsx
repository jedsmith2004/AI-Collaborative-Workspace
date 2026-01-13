import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, FileText, Users, Mail, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getWorkspaces, createWorkspace, type Workspace } from '../api/workspaces';
import { getInvitations, acceptInvitation, declineInvitation, getDashboardStats, type Invitation, type DashboardStats } from '../api/auth';
import NotificationsDropdown from '../components/Notifications/NotificationsDropdown';

export default function DashboardPage() {
  const { user, logout, getAccessToken } = useAuth();
  const navigate = useNavigate();
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Create workspace modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // User menu dropdown
  const [showUserMenu, setShowUserMenu] = useState(false);

    const loadDashboard = async () => {
      try {
        const token = await getAccessToken();
        
        const [workspacesData, invitationsData, statsData] = await Promise.all([
          getWorkspaces(token, true),
          getInvitations(token),
          getDashboardStats(token)
        ]);
        
        setWorkspaces(workspacesData);
        setInvitations(invitationsData);
        setStats(statsData);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadDashboard();
  }, [getAccessToken]);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      return;
    }
    
    setCreating(true);
    try {
      const token = await getAccessToken();
      const workspace = await createWorkspace(newWorkspaceName, newWorkspaceDescription, token);
      setWorkspaces(prev => [workspace, ...prev]);
      setShowCreateModal(false);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
      navigate(`/workspaces/${workspace.id}`);
    } catch (err) {
      console.error('Failed to create workspace:', err);
      setError('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      const token = await getAccessToken();
      await acceptInvitation(invitationId, token);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      // Reload workspaces
      const workspacesData = await getWorkspaces(token, true);
      setWorkspaces(workspacesData);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    }
  };

  const handleDeclineInvitation = async (invitationId: number) => {
    try {
      const token = await getAccessToken();
      await declineInvitation(invitationId, token);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Top Navigation */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤝</span>
              <span className="text-xl font-semibold text-white">AI Colab</span>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-sm font-medium text-indigo-400"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/workspaces')}
                className="text-sm font-medium text-gray-400 hover:text-white transition"
              >
                Workspaces
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationsDropdown onAccept={loadDashboard} />
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus size={16} />
              New Workspace
            </button>
            
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-700 transition"
              >
                {user?.profile_picture_url ? (
                  <img
                    src={user.profile_picture_url}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-xl border border-gray-700 shadow-lg py-2">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="font-medium text-sm text-white">{user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition flex items-center gap-2"
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Section */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2 text-white">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-400">
            Here's what's happening in your workspaces
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-2">
                <FolderOpen size={20} className="text-indigo-400" />
                <p className="text-2xl font-bold text-indigo-400">{stats.workspace_count}</p>
              </div>
              <p className="text-sm text-gray-400">Workspaces</p>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-2">
                <FileText size={20} className="text-purple-400" />
                <p className="text-2xl font-bold text-purple-400">{stats.note_count}</p>
              </div>
              <p className="text-sm text-gray-400">Notes</p>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Users size={20} className="text-green-400" />
                <p className="text-2xl font-bold text-green-400">{stats.collaborator_count}</p>
              </div>
              <p className="text-sm text-gray-400">Collaborators</p>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Mail size={20} className="text-orange-400" />
                <p className="text-2xl font-bold text-orange-400">{stats.pending_invitations}</p>
              </div>
              <p className="text-sm text-gray-400">Pending Invites</p>
            </div>
          </div>
        )}

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold mb-4 text-white">Pending Invitations</h2>
            <div className="space-y-3">
              {invitations.map(invitation => (
                <div
                  key={invitation.id}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-white">{invitation.workspace_name}</p>
                    <p className="text-sm text-gray-400">
                      Invited by {invitation.invited_by} · {invitation.permission_level === 2 ? 'Editor' : 'Viewer'} access
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id)}
                      className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(invitation.id)}
                      className="px-4 py-2 text-sm font-medium bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 transition text-gray-200"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workspaces */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Your Workspaces</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
            >
              <Plus size={16} />
              Create new
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {workspaces.length === 0 ? (
            <div className="bg-gray-800 rounded-2xl border-2 border-dashed border-gray-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={32} className="text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">No workspaces yet</h3>
              <p className="text-gray-400 mb-6">Create your first workspace to start collaborating</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
              >
                Create Workspace
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {workspaces.map(workspace => (
                <article
                  key={workspace.id}
                  onClick={() => navigate(`/workspaces/${workspace.id}`)}
                  className="group bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-gray-600 hover:bg-gray-750 transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">📁</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      workspace.role === 'owner' 
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : workspace.role === 'editor'
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {workspace.role?.charAt(0).toUpperCase()}{workspace.role?.slice(1)}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-indigo-400 transition">
                    {workspace.name}
                  </h3>
                  
                  {workspace.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText size={14} />
                      {workspace.note_count || 0} notes
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {workspace.member_count || 1} members
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-md p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6 text-white">Create New Workspace</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">Name</label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="My Workspace"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition text-white placeholder-gray-400"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">Description (optional)</label>
                <textarea
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  placeholder="What's this workspace for?"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition resize-none text-white placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewWorkspaceName('');
                  setNewWorkspaceDescription('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkspace}
                disabled={!newWorkspaceName.trim() || creating}
                className="px-6 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
