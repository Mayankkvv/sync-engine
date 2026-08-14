import { useEffect, useRef, useState } from "react";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function NavBar({ user, onLogout, onMenuClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-800"
          aria-label="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="relative w-6 h-6">
          <span className="absolute w-4 h-4 rounded-full bg-slate-800 opacity-80" />
          <span className="absolute w-4 h-4 rounded-full bg-blue-500 opacity-80 left-2 top-1" />
        </div>
        <span className="text-sm font-semibold text-slate-800">Sync Engine</span>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="w-8 h-8 rounded-full bg-slate-800 text-white text-xs font-medium flex items-center justify-center hover:bg-slate-700 transition-colors"
        >
          {getInitials(user.name)}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-sm font-medium text-slate-800 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default NavBar;