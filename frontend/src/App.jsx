import { useEffect, useRef, useState } from "react";
import { computeOperation, applyOperation } from "./utils/diff";

const API_URL = "http://localhost:5000/api/documents";
const WS_URL = "ws://localhost:5000";

function App() {
  const [documentId, setDocumentId] = useState(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("Loading...");
  const socketRef = useRef(null);
  const prevContentRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const res = await fetch(API_URL);
      const documents = await res.json();

      let doc;
      if (documents.length > 0) {
        doc = documents[0];
      } else {
        const createRes = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "My Document", content: "" }),
        });
        doc = await createRes.json();
      }

      if (cancelled) return;

      setDocumentId(doc._id);
      setContent(doc.content);
      prevContentRef.current = doc.content;

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("Connected");
        socket.send(JSON.stringify({ type: "join", documentId: doc._id }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "operation") {
          setContent((prev) => {
            const updated = applyOperation(prev, data.operation);
            prevContentRef.current = updated;
            return updated;
          });
        }
      };

      socket.onclose = () => {
        setStatus("Disconnected");
      };
    }

    init();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  function handleChange(e) {
    const newContent = e.target.value;
    const operation = computeOperation(prevContentRef.current, newContent);

    prevContentRef.current = newContent;
    setContent(newContent);

    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "operation", documentId, operation }));
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-slate-800">Sync Engine</h1>
          <span className="text-sm text-slate-500">{status}</span>
        </div>

        <textarea
          value={content}
          onChange={handleChange}
          className="w-full h-64 rounded-lg border border-slate-300 p-3 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
        />
      </div>
    </div>
  );
}

export default App;