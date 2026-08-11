import { useEffect, useRef, useState } from "react";
import { computeOperation } from "../utils/diff";
import { insertOperation, deleteOperation, undeleteOperation, toText, visibleIdAt } from "../utils/crdt";
import HistoryPanel from "./HistoryPanel";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/documents";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000";

function DocumentEditor({ documentId, token, userName }) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Loading...");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [showHistory, setShowHistory] = useState(false);

  const socketRef = useRef(null);
  const charactersRef = useRef([]);
  const pendingOpsRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const typingTimeoutsRef = useRef({});
  const siteIdRef = useRef(crypto.randomUUID());
  const counterRef = useRef(0);

  function nextId() {
    counterRef.current++;
    return `${siteIdRef.current}-${counterRef.current}`;
  }

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;
      setStatus("Connecting...");

      socket.onopen = async () => {
        if (cancelled) return;

        socket.send(
          JSON.stringify({ type: "join", documentId, token, userId: siteIdRef.current, name: userName })
        );

        const res = await fetch(`${API_URL}/${documentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setStatus("Not authorized");
          return;
        }

        const latestDoc = await res.json();
        if (cancelled) return;

        charactersRef.current = latestDoc.characters || [];
        setTitle(latestDoc.title);

        const queued = pendingOpsRef.current;
        pendingOpsRef.current = [];

        for (const op of queued) {
          if (op.kind === "insert") {
            insertOperation(charactersRef.current, op.character);
          } else if (op.kind === "delete") {
            deleteOperation(charactersRef.current, op.id);
          }
        }

        setContent(toText(charactersRef.current));
        setStatus("Connected");

        if (queued.length > 0) {
          socket.send(JSON.stringify({ type: "crdtOps", documentId, operations: queued }));
        }
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "error") {
          setStatus(data.message);
          return;
        }

        if (data.type === "crdtOps") {
          for (const op of data.operations) {
            if (op.kind === "insert") {
              insertOperation(charactersRef.current, op.character);
            } else if (op.kind === "delete") {
              deleteOperation(charactersRef.current, op.id);
            } else if (op.kind === "undelete") {
              undeleteOperation(charactersRef.current, op.id);
            }
          }
          setContent(toText(charactersRef.current));
        }

        if (data.type === "presence") {
          setOnlineUsers(data.users);
        }

        if (data.type === "typing") {
          setTypingUsers((prev) => {
            const updated = new Map(prev);
            updated.set(data.userId, data.name);
            return updated;
          });

          if (typingTimeoutsRef.current[data.userId]) {
            clearTimeout(typingTimeoutsRef.current[data.userId]);
          }

          typingTimeoutsRef.current[data.userId] = setTimeout(() => {
            setTypingUsers((prev) => {
              const updated = new Map(prev);
              updated.delete(data.userId);
              return updated;
            });
          }, 2000);
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setStatus("Disconnected — retrying...");
        reconnectTimeoutRef.current = setTimeout(() => connect(), 2000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      for (const timeoutId of Object.values(typingTimeoutsRef.current)) {
        clearTimeout(timeoutId);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [documentId, token, userName]);

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
    } else if (outgoingOps.length > 0) {
      pendingOpsRef.current.push(...outgoingOps);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-semibold text-slate-800 truncate">{title || "Untitled Document"}</h1>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowHistory(true)}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              History
            </button>
            <span className="text-sm text-slate-500">{status}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 text-xs text-slate-400">
          <span>
            {onlineUsers.length} online
            {onlineUsers.length > 0 ? `: ${onlineUsers.map((u) => u.name).join(", ")}` : ""}
          </span>
          <span className="italic">
            {typingUsers.size > 0 ? `${Array.from(typingUsers.values()).join(", ")} typing...` : ""}
          </span>
        </div>

        <textarea
          value={content}
          onChange={handleChange}
          className="w-full h-64 rounded-lg border border-slate-300 p-3 text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
        />
      </div>

      {showHistory && (
        <HistoryPanel documentId={documentId} token={token} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}

export default DocumentEditor;