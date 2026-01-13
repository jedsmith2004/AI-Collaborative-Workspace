import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { createWorkspace, getWorkspaces, type Workspace } from "../api/workspaces";
import NotificationsDropdown from "../components/Notifications/NotificationsDropdown";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasWorkspaces = useMemo(() => workspaces.length > 0, [workspaces]);

  const loadWorkspaces = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getWorkspaces(token);
      setWorkspaces(data);
    } catch (err) {
      console.error("Failed to load workspaces", err);
      setError("Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }
    if (!token) {
      setError("Not authenticated");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const workspace = await createWorkspace(name.trim(), description.trim(), token);
      setWorkspaces((prev) => [...prev, workspace]);
      setName("");
      setDescription("");
      navigate(`/workspaces/${workspace.id}`);
    } catch (err) {
      console.error("Failed to create workspace", err);
      setError("Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header with user info */}
      <nav className="border-b border-gray-800 bg-gray-900/95 backdrop-blur px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white hover:text-indigo-400 transition flex items-center gap-2">
            <span className="text-2xl">🤝</span>
            AI Colab
          </Link>
          <div className="flex items-center gap-4">
            {/* Notifications */}
            <NotificationsDropdown onAccept={loadWorkspaces} />
            
            {user && (
              <div className="flex items-center gap-3">
                {user.profile_picture_url ? (
                  <img 
                    src={user.profile_picture_url} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full border-2 border-gray-700"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <span className="text-sm text-gray-300 hidden sm:inline">{user.name}</span>
              </div>
            )}
            <button
              onClick={() => logout()}
              className="text-sm text-gray-400 hover:text-white transition px-3 py-1.5 hover:bg-gray-800 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="px-6 py-12">
        <header className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Workspaces</h1>
            <p className="mt-2 text-gray-400">
              Organize collaborative notes and chat by workspace.
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-medium text-white transition disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create workspace"}
          </button>
        </header>

        <main className="max-w-6xl mx-auto mt-12">
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {loading && !hasWorkspaces ? (
              <div className="col-span-full flex items-center justify-center text-gray-400">
                Loading workspaces…
              </div>
            ) : hasWorkspaces ? (
              workspaces.map((workspace) => (
                <article
                  key={workspace.id}
                  className="group rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg hover:border-gray-600 hover:shadow-xl transition cursor-pointer"
                  onClick={() => navigate(`/workspaces/${workspace.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">📁</span>
                    <div className="flex items-center gap-2">
                      {workspace.role && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          workspace.role === 'owner' 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : workspace.role === 'editor' 
                              ? 'bg-indigo-500/20 text-indigo-400' 
                              : 'bg-gray-700 text-gray-400'
                        }`}>
                          {workspace.role}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(workspace.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <h2 className="mt-4 text-xl font-semibold leading-tight text-white group-hover:text-indigo-400">
                    {workspace.name}
                  </h2>
                  {workspace.description && (
                    <p className="mt-2 text-sm text-gray-400 max-h-20 overflow-hidden text-ellipsis">
                      {workspace.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    <span>{workspace.note_count || 0} notes</span>
                    <span>{workspace.member_count || 1} member{(workspace.member_count || 1) !== 1 ? 's' : ''}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-gray-700 bg-gray-800/50 p-14 text-center">
                <h2 className="text-2xl font-semibold text-white">Create your first workspace</h2>
                <p className="mt-2 text-gray-400">
                  Workspaces keep notes, chat, and collaborators together. Start by naming one below.
                </p>
              </div>
            )}
          </section>

          <section className="mt-16 max-w-2xl">
            <h3 className="text-lg font-semibold text-white">New workspace</h3>
            <p className="text-sm text-gray-400">Give it a name and optional description.</p>
            <div className="mt-6 space-y-4">
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Workspace name"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Description (optional)"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[120px] resize-none"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-sm font-medium text-white transition disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create workspace"}
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
