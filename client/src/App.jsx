import { useEffect, useState } from "react";
import "./App.css";
import { apiRequest } from "./services/api";
import ExplorePage from "./pages/ExplorePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await apiRequest("/api/auth/me");
        const loggedInUser = data.user || data.data?.user || data;

        setUser(loggedInUser);
        localStorage.setItem("nuspacesUser", JSON.stringify(loggedInUser));
      } catch {
        localStorage.removeItem("nuspacesUser");
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  function handleLogin(userData) {
    setUser(userData);
    localStorage.setItem("nuspacesUser", JSON.stringify(userData));
    setShowLogin(false);
  }

  async function handleLogout() {
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      console.warn("Logout API failed:", err.message);
    }

    localStorage.removeItem("nuspacesUser");
    setUser(null);
    setShowLogin(false);
  }

  if (checkingAuth) {
    return (
      <div className="np-page">
        <div className="np-main">
          <div className="np-state-card">Checking login status...</div>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={() => setShowLogin(false)}
      />
    );
  }

  return (
    <ExplorePage
      user={user}
      onLoginClick={() => setShowLogin(true)}
      onLogout={handleLogout}
    />
  );
}