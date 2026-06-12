import { useState } from "react";
import { ArrowLeft, LogIn, UserPlus } from "lucide-react";
import { apiRequest } from "../services/api";

export default function LoginPage({ onLogin, onBack }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }

    if (mode === "register" && !username) {
      setError("Please enter a username.");
      setLoading(false);
      return;
    }

    try {
      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/register";

      const body =
        mode === "login"
          ? { email, password }
          : { email, password, username };

      const data = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const loggedInUser = data.user || data.data?.user || data;

      localStorage.setItem("nuspacesUser", JSON.stringify(loggedInUser));
      onLogin(loggedInUser);
    } catch (err) {
      setError(err.message || "Unable to continue.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setError("");
    setMode(mode === "login" ? "register" : "login");
  }

  return (
    <div className="simpleLoginPage">
      <div className="simpleLoginCard">
        {onBack && (
          <button className="backButton" onClick={onBack}>
            <ArrowLeft size={15} />
            Back to Explore
          </button>
        )}

        <div className="loginLogo">
          <div className="np-logo-mark">
            <span>NS</span>
          </div>
          <div>
            <h1>NUSpaces</h1>
            <p>Campus study spaces, updated live</p>
          </div>
        </div>

        <div className="loginModeBadge">
          {mode === "login" ? <LogIn size={14} /> : <UserPlus size={14} />}
          {mode === "login" ? "Welcome back" : "Create account"}
        </div>

        <form onSubmit={handleSubmit} className="simpleLoginForm">
          {mode === "register" && (
            <div className="formGroup">
              <label>Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div className="formGroup">
            <label>NUS Email</label>
            <input
              type="email"
              placeholder="e.g. e1234567@u.nus.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="simpleError">{error}</p>}

          <button className="simpleLoginButton" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Register"}
          </button>
        </form>

        <p className="switchText">
          {mode === "login"
            ? "Don't have an account?"
            : "Already have an account?"}{" "}
          <button type="button" onClick={switchMode}>
            {mode === "login" ? "Register here" : "Login here"}
          </button>
        </p>
      </div>
    </div>
  );
}