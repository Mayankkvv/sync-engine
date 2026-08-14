import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/documents";

function Sidebar({ token, selectedDocumentId, onSelectDocument, open, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    async function loadDocuments() {
      try {
        const res = await fetch(API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Server responded with status ${res.status}`);
        }
        const data = await res.json();
        setDocuments(data);
      } catch (err) {
        console.error("Failed to load documents:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, [token]);

  function handleSelect(docId) {
    onSelectDocument(docId);
    if (onClose) onClose();
  }

  async function handleCreate() {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: "Untitled Document", content: "" }),
      });
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      const newDoc = await res.json();
      setDocuments((prev) => [newDoc, ...prev]);
      handleSelect(newDoc._id);
    } catch (err) {
      console.error("Failed to create document:", err);
      setError(err.message);
    }
  }

  function handleRenameStart(doc) {
    setRenamingId(doc._id);
    setRenameValue(doc.title);
  }

  function handleRenameCancel() {
    setRenamingId(null);
  }

  async function handleRenameSubmit(docId) {
    const trimmed = renameValue.trim();
    setRenamingId(null);

    if (!trimmed) return;

    try {
      const res = await fetch(`${API_URL}/${docId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      const updated = await res.json();
      setDocuments((prev) => prev.map((d) => (d._id === docId ? updated : d)));
    } catch (err) {
      console.error("Failed to rename document:", err);
      setError(err.message);
    }
  }

  async function handleDelete(docId) {
    const confirmed = window.confirm("Delete this document? This can't be undone.");
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
      if (docId === selectedDocumentId) {
        onSelectDocument(null);
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      setError(err.message);
    }
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onClose} />}

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:z-auto md:h-full`}
      >
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <button
            onClick={handleCreate}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            + New Document
          </button>
          <button
            onClick={onClose}
            className="md:hidden p-2 text-slate-400 hover:text-slate-700"
            aria-label="Close sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="p-4 text-sm text-slate-400">Loading...</p>}

          {error && <p className="p-4 text-sm text-red-500">Couldn't reach the server: {error}</p>}

          {!loading && !error && documents.length === 0 && (
            <p className="p-4 text-sm text-slate-400">No documents yet.</p>
          )}

          {documents.map((doc) => (
            <div
              key={doc._id}
              className={`group border-b border-slate-100 ${
                doc._id === selectedDocumentId ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              {renamingId === doc._id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameSubmit(doc._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameSubmit(doc._id);
                    if (e.key === "Escape") handleRenameCancel();
                  }}
                  className="w-full px-4 py-3 text-sm border-none focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              ) : (
                <div className="flex items-center px-4 py-3">
                  <button
                    onClick={() => handleSelect(doc._id)}
                    className={`flex-1 text-left text-sm truncate ${
                      doc._id === selectedDocumentId ? "text-slate-800 font-medium" : "text-slate-600"
                    }`}
                  >
                    {doc.title || "Untitled Document"}
                  </button>
                  <div className="flex items-center gap-2 ml-2 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleRenameStart(doc)}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default Sidebar;