import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/documents";

function Sidebar({ token, selectedDocumentId, onSelectDocument }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      onSelectDocument(newDoc._id);
    } catch (err) {
      console.error("Failed to create document:", err);
      setError(err.message);
    }
  }

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200">
        <button
          onClick={handleCreate}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          + New Document
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="p-4 text-sm text-slate-400">Loading...</p>}

        {error && (
          <p className="p-4 text-sm text-red-500">
            Couldn't reach the server: {error}
          </p>
        )}

        {!loading && !error && documents.length === 0 && (
          <p className="p-4 text-sm text-slate-400">No documents yet.</p>
        )}

        {documents.map((doc) => (
          <button
            key={doc._id}
            onClick={() => onSelectDocument(doc._id)}
            className={`w-full text-left px-4 py-3 border-b border-slate-100 text-sm truncate transition-colors ${
              doc._id === selectedDocumentId
                ? "bg-slate-100 text-slate-800 font-medium"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {doc.title || "Untitled Document"}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Sidebar;