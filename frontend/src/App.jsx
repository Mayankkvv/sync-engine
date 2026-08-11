import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import DocumentEditor from "./components/DocumentEditor";
import Login from "./components/Login";

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setAuthLoaded(true);
  }, []);

  function handleLogin(newToken, newUser) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setSelectedDocumentId(null);
  }

  if (!authLoaded) {
    return null;
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
        <span className="text-sm text-slate-600">Signed in as {user.name}</span>
        <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-800">
          Log out
        </button>
      </div>

      <div className="flex-1 flex">
        <Sidebar token={token} selectedDocumentId={selectedDocumentId} onSelectDocument={setSelectedDocumentId} />

        {selectedDocumentId ? (
          <DocumentEditor key={selectedDocumentId} documentId={selectedDocumentId} token={token} userName={user.name} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a document from the sidebar, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;