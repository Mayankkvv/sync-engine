import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/documents";

function normalizeId(value) {
  if (!value) return "";
  const id = typeof value === "object" ? value._id || value.id : value;
  return id ? String(id) : "";
}

function SharePanel({ documentId, token, currentUserId, onClose }) {
  const [owner, setOwner] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [serverIsOwner, setServerIsOwner] = useState(null);

  useEffect(() => {
    async function loadDocument() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_URL}/${documentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Server responded with status ${res.status}`);
        }
        const data = await res.json();
        setOwner(data.owner);
        setCollaborators(data.collaborators || []);
        setServerIsOwner(typeof data.isOwner === "boolean" ? data.isOwner : null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [documentId, token]);

  const ownerId = normalizeId(owner);
  const isOwner =
    typeof serverIsOwner === "boolean"
      ? serverIsOwner
      : Boolean(ownerId && ownerId === normalizeId(currentUserId));

  async function handleInvite(e) {
    e.preventDefault();
    setError(null);
    setInviting(true);

    try {
      const res = await fetch(`${API_URL}/${documentId}/collaborators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setCollaborators(data.collaborators);
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(collaboratorId) {
    try {
      const res = await fetch(`${API_URL}/${documentId}/collaborators/${collaboratorId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      setCollaborators((prev) => prev.filter((c) => normalizeId(c) !== normalizeId(collaboratorId)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-3 md:p-6 z-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Share</h2>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">
            Close
          </button>
        </div>

        {loading && <p className="text-sm text-slate-400">Loading...</p>}

        {!loading && (
          <>
            {owner && (
              <p className="text-xs text-slate-400 mb-3">
                Owned by {isOwner ? "you" : owner.name}
              </p>
            )}

            {isOwner && (
              <form onSubmit={handleInvite} className="flex gap-2 mb-4">
                <input
                  type="email"
                  placeholder="Invite by email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {inviting ? "Inviting..." : "Invite"}
                </button>
              </form>
            )}

            {!isOwner && (
              <p className="text-sm text-slate-500 mb-4">
                Only the owner can invite or remove collaborators.
              </p>
            )}

            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

            <p className="text-xs font-medium text-slate-500 mb-2">
              People with access ({collaborators.length})
            </p>

            {collaborators.length === 0 && (
              <p className="text-sm text-slate-400">No one else has access yet.</p>
            )}

            <div className="space-y-2">
              {collaborators.map((c) => (
                <div key={normalizeId(c)} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => handleRemove(c._id)}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SharePanel;
