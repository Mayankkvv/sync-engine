import { useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { computeOperation } from "../utils/diff";
import {
  insertOperation,
  deleteOperation,
  undeleteOperation,
  toText,
  visibleIdAt,
  visibleIndexOfId,
} from "../utils/crdt";
import { cursorField, setCursorsEffect, colorForUserId } from "../utils/cursorExtension";
import HistoryPanel from "./HistoryPanel";
import SharePanel from "./SharePanel";
import StatusIndicator from "./StatusIndicator";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/documents";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5000";

function connectionColor(status) {
  if (status.startsWith("Connected")) return "green";
  if (status.startsWith("Connecting")) return "yellow";
  return "red";
}

function DocumentEditor({ documentId, token, userName, currentUserId }) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Loading...");
  const [saveStatus, setSaveStatus] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [showHistory, setShowHistory] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const socketRef = useRef(null);
  const charactersRef = useRef([]);
  const pendingOpsRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const typingTimeoutsRef = useRef({});
  const siteIdRef = useRef(crypto.randomUUID());
  const counterRef = useRef(0);
  const viewRef = useRef(null);
  const applyingRemoteRef = useRef(false);
  const remoteCursorsRef = useRef({});

  function nextId() {
    counterRef.current++;
    return `${siteIdRef.current}-${counterRef.current}`;
  }

  function updateCursorDecorations() {
    const view = viewRef.current;
    if (!view) return;

    const docLength = view.state.doc.length;
    const cursors = Object.values(remoteCursorsRef.current).map((cursor) => ({
      ...cursor,
      position: Math.min(cursor.position, docLength),
    }));

    view.dispatch({ effects: setCursorsEffect.of(cursors) });
  }

  function dispatchRemoteChange(from, to, insert) {
    const view = viewRef.current;
    if (!view) return;

    applyingRemoteRef.current = true;
    view.dispatch({ changes: { from, to, insert } });
    applyingRemoteRef.current = false;
  }

  function applyRemoteOperation(op) {
    if (op.kind === "insert") {
      insertOperation(charactersRef.current, op.character);
      const index = visibleIndexOfId(charactersRef.current, op.character.id);
      if (index !== -1) {
        dispatchRemoteChange(index, index, op.character.char);
      }
    } else if (op.kind === "delete") {
      const index = visibleIndexOfId(charactersRef.current, op.id);
      deleteOperation(charactersRef.current, op.id);
      if (index !== -1) {
        dispatchRemoteChange(index, index + 1, "");
      }
    } else if (op.kind === "undelete") {
      undeleteOperation(charactersRef.current, op.id);
      const index = visibleIndexOfId(charactersRef.current, op.id);
      const character = charactersRef.current.find((c) => c.id === op.id);
      if (index !== -1 && character) {
        dispatchRemoteChange(index, index, character.char);
      }
    }
  }

  const extensions = useMemo(
    () => [
      cursorField,
      EditorView.updateListener.of((update) => {
        if (!update.selectionSet) return;
        if (applyingRemoteRef.current) return;

        const position = update.state.selection.main.head;
        const socket = socketRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "cursor", documentId, position }));
        }
      }),
    ],
    [documentId]
  );

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
        setSaveStatus("saved");

        if (queued.length > 0) {
          setSaveStatus("saving");
          socket.send(JSON.stringify({ type: "crdtOps", documentId, operations: queued }));
        }
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "error") {
          setStatus(data.message);
          return;
        }

        if (data.type === "saved") {
          setSaveStatus("saved");
        }

        if (data.type === "crdtOps") {
          for (const op of data.operations) {
            applyRemoteOperation(op);
          }
          setContent(toText(charactersRef.current));
        }

        if (data.type === "presence") {
          setOnlineUsers(data.users);

          const onlineIds = new Set(data.users.map((u) => u.userId));
          for (const id of Object.keys(remoteCursorsRef.current)) {
            if (!onlineIds.has(id)) {
              delete remoteCursorsRef.current[id];
            }
          }
          updateCursorDecorations();
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

        if (data.type === "cursor") {
          remoteCursorsRef.current[data.userId] = {
            name: data.name,
            color: colorForUserId(data.userId),
            position: data.position,
          };
          updateCursorDecorations();
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

  function handleChange(newText) {
    if (applyingRemoteRef.current) return;

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
      setSaveStatus("saving");
      socket.send(JSON.stringify({ type: "crdtOps", documentId, operations: outgoingOps }));
    } else if (outgoingOps.length > 0) {
      pendingOpsRef.current.push(...outgoingOps);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-3 md:p-6 min-w-0">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-y-1 mb-2">
          <h1 className="text-lg font-semibold text-slate-800 truncate">{title || "Untitled Document"}</h1>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowShare(true)}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Share
            </button>
            <button
              onClick={() => setShowHistory(true)}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              History
            </button>
            <StatusIndicator label={status} color={connectionColor(status)} />
            {saveStatus && (
              <span className="text-xs text-slate-400">
                {saveStatus === "saving" ? "Saving..." : "Saved"}
              </span>
            )}
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

        <div className="rounded-lg border border-slate-300 overflow-hidden">
          <CodeMirror
            value={content}
            height="256px"
            extensions={extensions}
            onChange={handleChange}
            onCreateEditor={(view) => {
              viewRef.current = view;
            }}
          />
        </div>
      </div>

      {showHistory && (
        <HistoryPanel documentId={documentId} token={token} onClose={() => setShowHistory(false)} />
      )}

      {showShare && (
        <SharePanel
          documentId={documentId}
          token={token}
          currentUserId={currentUserId}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

export default DocumentEditor;