import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/documents";

function HistoryPanel({ documentId, token, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`${API_URL}/${documentId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Server responded with status ${res.status}`);
        }
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [documentId, token]);

  async function handleSelect(logId) {
    setSelectedLogId(logId);
    setPreview(null);
    setPreviewLoading(true);

    try {
      const res = await fetch(`${API_URL}/${documentId}/version/${logId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      const data = await res.json();
      setPreview(data.content);
    } catch (err) {
      setError(err.message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleRestore() {
    if (!selectedLogId) return;
    setRestoring(true);

    try {
      const res = await fetch(`${API_URL}/${documentId}/restore/${selectedLogId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }
      onClose();
    } catch (err) {
      setError(err.message);
      setRestoring(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-3 md:p-6 z-50">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-slate-200 p-4 md:p-6 max-h-[85vh] md:max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Version History</h2>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">
            Close
          </button>
        </div>

        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}

        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
          <div className="w-full md:w-1/3 max-h-40 md:max-h-none overflow-y-auto border-b md:border-b-0 md:border-r border-slate-100 pb-3 md:pb-0 md:pr-3">
            {loading && <p className="text-sm text-slate-400">Loading...</p>}

            {!loading && logs.length === 0 && (
              <p className="text-sm text-slate-400">No history yet.</p>
            )}

            {logs.map((log) => (
              <button
                key={log._id}
                onClick={() => handleSelect(log._id)}
                className={`w-full text-left px-2 py-2 rounded-md text-xs mb-1 transition-colors ${
                  log._id === selectedLogId
                    ? "bg-slate-100 text-slate-800 font-medium"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <div>{new Date(log.createdAt).toLocaleString()}</div>
                <div className="text-slate-400">{log.operations.length} change(s)</div>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedLogId && (
              <p className="text-sm text-slate-400">Select a point in history to preview it.</p>
            )}

            {selectedLogId && previewLoading && (
              <p className="text-sm text-slate-400">Loading preview...</p>
            )}

            {selectedLogId && !previewLoading && preview !== null && (
              <>
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono border border-slate-200 rounded-lg p-3 mb-3">
                  {preview || "(empty)"}
                </pre>
                <button
                  onClick={handleRestore}
                  disabled={restoring}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {restoring ? "Restoring..." : "Restore this version"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryPanel;