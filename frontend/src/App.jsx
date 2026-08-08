import { useEffect, useRef, useState } from "react";
import { computeOperation } from "./utils/diff";
import { insertOperation, deleteOperation, toText, visibleIdAt } from "./utils/crdt";

const API_URL = "http://localhost:5000/api/documents";
const WS_URL = "ws://localhost:5000";

function App() {
  const [documentId, setDocumentId] = useState(null);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("Loading...");

  const socketRef = useRef(null);
  const charactersRef = useRef([]);
  const siteIdRef = useRef(crypto.randomUUID());
  const counterRef = useRef(0);

  function nextId() {
    counterRef.current++;
    return `${siteIdRef.current}-${counterRef.current}`;
  }

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

      charactersRef.current = doc.characters || [];
      setDocumentId(doc._id);
      setContent(toText(charactersRef.current));

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("Connected");
        socket.send(JSON.stringify({ type: "join", documentId: doc._id }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "crdtOps") {
          for (const op of data.operations) {
            if (op.kind === "insert") {
              insertOperation(charactersRef.current, op.character);
            } else if (op.kind === "delete") {
              deleteOperation(charactersRef.current, op.id);
            }
          }
          setContent(toText(charactersRef.current));
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
    const newText = e.target.value;
    const oldText = toText(charactersRef.current);
    const diff = computeOperation(oldText, newText);
    const outgoingOps = [];

    for (let i = 0; i < diff.deleteCount; i++) {
      const id = visibleIdAt(charactersRef.current, diff.position);
      if (id) {
        deleteOperation(charactersRef.current, id);
        outgoingOps.push({ kind: "delete", id });
      }
    }

    let afterId =
      diff.position === 0 ? null : visibleIdAt(charactersRef.current, diff.position - 1);

    for (const char of diff.insertText) {
      const character = { id: nextId(), char, afterId, deleted: false };
      insertOperation(charactersRef.current, character);
      outgoingOps.push({ kind: "insert", character });
      afterId = character.id;
    }

    setContent(toText(charactersRef.current));

    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN && outgoingOps.length > 0) {
      socket.send(JSON.stringify({ type: "crdtOps", documentId, operations: outgoingOps }));
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