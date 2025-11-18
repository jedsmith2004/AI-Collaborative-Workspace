import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createWorkspace, getWorkspaces, type Workspace } from "../api/workspaces";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasWorkspaces = useMemo(() => workspaces.length > 0, [workspaces]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getWorkspaces();
        if (mounted) {
          setWorkspaces(data);
        }
      } catch (err) {
        console.error("Failed to load workspaces", err);
        if (mounted) {
          setError("Failed to load workspaces");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const workspace = await createWorkspace(name.trim(), description.trim());
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
    <div className="min-h-screen bg-[#f7f6f3] text-[#2f3437] px-10 py-12">
      <header className="max-w-5xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-2 text-[#9b9a97]">
            Organize collaborative notes and chat by workspace.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-lg border border-[#d9d8d3] bg-white px-5 py-2.5 text-sm font-medium hover:bg-[#f3f2ef] transition disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create workspace"}
        </button>
      </header>

      <main className="max-w-5xl mx-auto mt-12">
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading && !hasWorkspaces ? (
            <div className="col-span-full flex items-center justify-center text-[#9b9a97]">
              Loading workspaces…
            </div>
          ) : hasWorkspaces ? (
            workspaces.map((workspace) => (
              <article
                key={workspace.id}
                className="group rounded-2xl border border-[#e3e2e0] bg-white p-6 shadow-sm hover:border-[#c1c0bc] hover:shadow transition cursor-pointer"
                onClick={() => navigate(`/workspaces/${workspace.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📁</span>
                  <span className="text-xs uppercase tracking-wide text-[#b8b6af]">
                    {new Date(workspace.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-semibold leading-tight group-hover:text-[#3b82f6]">
                  {workspace.name}
                </h2>
                {workspace.description && (
                  <p className="mt-2 text-sm text-[#7f7d77] max-h-20 overflow-hidden text-ellipsis">
                    {workspace.description}
                  </p>
                )}
              </article>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-[#d9d8d3] bg-white/60 p-14 text-center">
              <h2 className="text-2xl font-semibold">Create your first workspace</h2>
              <p className="mt-2 text-[#9b9a97]">
                Workspaces keep notes, chat, and collaborators together. Start by naming one below.
              </p>
            </div>
          )}
        </section>

        <section className="mt-16 max-w-2xl">
          <h3 className="text-lg font-semibold">New workspace</h3>
          <p className="text-sm text-[#9b9a97]">Give it a name and optional description.</p>
          <div className="mt-6 space-y-4">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Workspace name"
              className="w-full rounded-lg border border-[#d9d8d3] bg-white px-4 py-3 text-sm outline-none focus:border-[#3b82f6] focus:ring"
            />
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-[#d9d8d3] bg-white px-4 py-3 text-sm outline-none focus:border-[#3b82f6] focus:ring min-h-[120px] resize-none"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg border border-[#d9d8d3] bg-white px-5 py-2 text-sm font-medium hover:bg-[#f3f2ef] transition disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
