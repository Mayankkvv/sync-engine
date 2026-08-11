import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/documents";

function Sidebar({ selectedDocumentId, onSelectDocument }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocuments() {
      const res = await fetch(API_URL);
      const data = await res.json();
      setDocuments(data);
      setLoading(false);
    }

    loadDocuments();
  }, []);

  async function handleCreate() {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Document", content: "" }),
    });
    const newDoc = await res.json();
    setDocuments((prev) => [newDoc, ...prev]);
    onSelectDocument(newDoc._id);
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

        {!loading && documents.length === 0 && (
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