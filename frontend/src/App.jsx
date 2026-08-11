import { useState } from "react";
import Sidebar from "./components/Sidebar";
import DocumentEditor from "./components/DocumentEditor";

function App() {
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  return (
    <div className="h-screen flex bg-slate-100">
      <Sidebar selectedDocumentId={selectedDocumentId} onSelectDocument={setSelectedDocumentId} />

      {selectedDocumentId ? (
        <DocumentEditor key={selectedDocumentId} documentId={selectedDocumentId} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Select a document from the sidebar, or create a new one.
        </div>
      )}
    </div>
  );
}

export default App;