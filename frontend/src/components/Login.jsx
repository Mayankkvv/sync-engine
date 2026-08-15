import { useState } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/documents").replace(
  "/documents",
  ""
);

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  function switchMode(newMode) {
    setMode(newMode);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "forgot") {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong");
        setMessage(data.message);
        return;
      }

      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-lg font-semibold text-slate-800 mb-4">
          {mode === "login" && "Log In"}
          {mode === "register" && "Create Account"}
          {mode === "forgot" && "Reset Password"}
        </h1>

        {mode === "forgot" && !message && (
          <p className="text-sm text-slate-500 mb-3">
            Enter your email and we'll send you a link to reset your password.
          </p>
        )}

        {message && <p className="text-sm text-emerald-600 mb-3">{message}</p>}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              required
            />
            {mode !== "forgot" && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                required
              />
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Log In"
                : mode === "register"
                ? "Create Account"
                : "Send Reset Link"}
            </button>
          </form>
        )}

        {mode === "forgot" ? (
          <button
            onClick={() => switchMode("login")}
            className="w-full text-center mt-3 text-sm text-slate-500 hover:text-slate-800"
          >
            Back to log in
          </button>
        ) : (
          <>
            {mode === "login" && (
              <button
                onClick={() => switchMode("forgot")}
                className="w-full text-center mt-3 text-xs text-slate-400 hover:text-slate-700"
              >
                Forgot password?
              </button>
            )}
            <button
              onClick={() => switchMode(mode === "login" ? "register" : "login")}
              className="w-full text-center mt-2 text-sm text-slate-500 hover:text-slate-800"
            >
              {mode === "login" ? "Need an account? Register" : "Already have an account? Log in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;