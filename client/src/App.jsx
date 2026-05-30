import { useState } from "react";
import "./App.css";
import { apiRequest } from "./services/api";
import ExplorePage from "./pages/ExplorePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("nuspacesUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [showLogin, setShowLogin] = useState(false);

  function handleLogin(userData) {
    setUser(userData);
    setShowLogin(false);
  }

  async function handleLogout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout failed:", err.message);
    }
    localStorage.removeItem("nuspacesUser");
    setUser(null);
  }

  if (showLogin) {
    return <LoginPage onLogin={handleLogin} onBack={() => setShowLogin(false)} />;
  }

  return (
    <ExplorePage
      user={user}
      onLoginClick={() => setShowLogin(true)}
      onLogout={handleLogout}
    />
  );
}