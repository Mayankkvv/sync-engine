import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import DocumentEditor from "./components/DocumentEditor";
import Login from "./components/Login";
import ResetPassword from "./components/ResetPassword";
import NavBar from "./components/NavBar";

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resetToken, setResetToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("resetToken");
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
    }

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

  function handleResetDone() {
    setResetToken(null);
    window.history.replaceState({}, "", window.location.pathname);
  }

  if (!authLoaded) {
    return null;
  }

  if (resetToken) {
    return <ResetPassword token={resetToken} onDone={handleResetDone} />;
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      <NavBar user={user} onLogout={handleLogout} onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex-1 flex relative overflow-hidden">
        <Sidebar
          token={token}
          currentUserId={user.id}
          selectedDocumentId={selectedDocumentId}
          onSelectDocument={setSelectedDocumentId}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {selectedDocumentId ? (
          <DocumentEditor
            key={selectedDocumentId}
            documentId={selectedDocumentId}
            token={token}
            userName={user.name}
            currentUserId={user.id}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm px-4 text-center">
            Select a document from the sidebar, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;