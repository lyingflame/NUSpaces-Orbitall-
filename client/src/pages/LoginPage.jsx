import { useState } from "react";
import { apiRequest } from "../services/api";

export default function LoginPage({ onLogin, onBack }) {
  const [mode, setMode] = useState("login"); // "login" or "register"
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

      localStorage.setItem("nuspacesUser", JSON.stringify(data.user));

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
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
            ← Back to Explore
          </button>
        )}

        <h1>NUSpaces</h1>
        <p className="loginSubtext">
          {mode === "login"
            ? "Login to your account"
            : "Create a new NUSpaces account"}
        </p>

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
            <label>Email</label>
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
          <button onClick={switchMode}>
            {mode === "login" ? "Register here" : "Login here"}
          </button>
        </p>
      </div>
    </div>
  );
}